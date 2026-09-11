#!/usr/bin/env python3
"""AI Agent 纯工具执行器（不含 LLM）。

职责：维护工具注册表，接收 (工具名, JSON 参数)，执行并返回 JSON 结果。
LLM 的调用与 Agent Loop 由前端 /api/chat 负责，本脚本只当作"工具执行后端"。

用法：
  python tools_runner.py --list-tools              # 输出所有工具的 JSON Schema
  python tools_runner.py --exec <name> '<json>'   # 执行一次工具，输出 JSON 结果
  python tools_runner.py                          # CLI 自测循环（输入: 工具名 json参数，quit 退出）
"""

from __future__ import annotations

import ast
import datetime
import json
import re
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from typing import Any, Callable, Dict

# web_fetch 常量
_WEB_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
_WEB_MAX_BYTES = 1_000_000   # 抓取内容大小上限 1MB
_WEB_MAX_CHARS = 4000        # 返回给模型的最大字符数


# ---------------------------------------------------------------------------
# 工具实现：每个工具 = schema(JSON Schema) + run(执行函数)
# ---------------------------------------------------------------------------
class _TextExtractor(HTMLParser):
    """用标准库 HTMLParser 提取可读文本，跳过脚本/样式/标签内容。"""

    SKIP = {"script", "style", "noscript", "svg", "head", "iframe", "template"}
    BLOCK = {"p", "div", "br", "li", "h1", "h2", "h3", "h4", "tr", "td", "th"}

    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in self.SKIP:
            self._skip_depth += 1
        if tag in self.BLOCK:
            self.parts.append("\n")

    def handle_startendtag(self, tag: str, attrs) -> None:
        if tag == "br":
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in self.SKIP and self._skip_depth > 0:
            self._skip_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0 and data and data.strip():
            self.parts.append(data)


def _html_to_text(html: str) -> str:
    parser = _TextExtractor()
    try:
        parser.feed(html)
    except Exception:
        pass
    raw = "\n".join(parser.parts)
    # 压缩行内连续空白与空行
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in raw.splitlines()]
    return "\n".join(ln for ln in lines if ln)


def _web_fetch_run(args: Dict[str, Any]) -> Dict[str, Any]:
    """抓取指定网页并返回可读纯文本（社交/攻略/API 均可）。"""
    url = args.get("url")
    if not isinstance(url, str) or not url.strip():
        raise ValueError("缺少 url：url 必须为非空字符串")

    scheme = urllib.parse.urlparse(url).scheme
    if scheme not in ("http", "https"):
        raise ValueError(f"仅支持 http/https URL，收到: {scheme}")

    req = urllib.request.Request(
        url,
        headers={"User-Agent": _WEB_USER_AGENT, "Accept": "*/*"},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:  # redirects 自动跟随
        raw = resp.read(_WEB_MAX_BYTES)
        ctype = resp.headers.get("Content-Type", "")

    text = raw.decode("utf-8", errors="replace")
    body = text if "json" in ctype else _html_to_text(text)
    body = "\n".join(ln for ln in (re.sub(r"[ \t]+", " ", ln).strip() for ln in body.splitlines()) if ln)
    return {"url": url, "content_type": ctype, "text": body[:_WEB_MAX_CHARS]}



# ---------------------------------------------------------------------------
# 工具注册表
# ---------------------------------------------------------------------------

TOOLS: Dict[str, Dict[str, Any]] = {
    "web_fetch": {
        "schema": {
            "type": "function",
            "function": {
                "name": "web_fetch",
                "description": (
                    "抓取指定网页并提取可读纯文本（含 JSON API）。"
                    "用于查询游戏攻略 Wiki、百科、VRChat 世界信息等任意外部网页。"
                    "返回前 4000 字符。"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {
                            "type": "string",
                            "description": "要抓取的 http/https 网页地址",
                        }
                    },
                    "required": ["url"],
                },
            },
        },
        "run": _web_fetch_run,
    },
}


# ---------------------------------------------------------------------------
# 分发与入口
# ---------------------------------------------------------------------------

def _dispatch(name: str, args: Dict[str, Any]) -> int:
    """执行单个工具并打印 JSON 结果。

    约定：工具执行无论成败都打印 JSON 并以退出码 0 结束，错误一律放在
    JSON 的 ok/error 字段里。这样下游（如 Node execFileSync）能稳定读到
    结构化结果，把错误反馈给 LLM 而非视为进程崩溃。
    """
    if name not in TOOLS:
        print(json.dumps({"ok": False, "error": f"未知工具: {name}"}, ensure_ascii=False))
        return 0
    try:
        result = TOOLS[name]["run"](args)
        print(json.dumps({"ok": True, "result": result}, ensure_ascii=False))
        return 0
    except Exception as exc:  # 业务/运行时错误统一转为错误结果，进程不崩溃
        print(json.dumps({"ok": False, "error": f"执行失败: {exc}"}, ensure_ascii=False))
        return 0


def _cli_loop() -> int:
    """CLI 自测循环：每次输入一条工具调用，打印结果。"""
    print("AI Agent 工具执行器（CLI 自测）| 输入: 工具名 JSON参数 | 输入 quit 退出")
    while True:
        try:
            line = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not line:
            continue
        if line in ("quit", "exit"):
            return 0
        parts = line.split(maxsplit=1)
        name = parts[0]
        raw = parts[1] if len(parts) > 1 else "{}"
        try:
            args = json.loads(raw)
        except json.JSONDecodeError as exc:
            print(f"参数不是合法 JSON: {exc}")
            continue
        _dispatch(name, args)


def main(argv: list[str]) -> int:
    if argv[:1] == ["--list-tools"]:
        print(json.dumps([TOOLS[n]["schema"] for n in TOOLS], ensure_ascii=False))
        return 0

    if argv[:1] == ["--exec"]:
        name = argv[1] if len(argv) > 1 else ""
        raw = argv[2] if len(argv) > 2 else "{}"
        try:
            args = json.loads(raw)
        except json.JSONDecodeError as exc:
            print(json.dumps({"ok": False, "error": f"参数不是合法 JSON: {exc}"}, ensure_ascii=False))
            return 0
        return _dispatch(name, args)

    return _cli_loop()


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
