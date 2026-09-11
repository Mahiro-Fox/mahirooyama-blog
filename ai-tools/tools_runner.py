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
import sys
from typing import Any, Callable, Dict


# ---------------------------------------------------------------------------
# 工具实现：每个工具 = schema(JSON Schema) + run(执行函数)
# ---------------------------------------------------------------------------

def _calculator_run(args: Dict[str, Any]) -> Dict[str, Any]:
    """计算数学表达式。使用受限 AST 求值，避免 eval 任意代码。"""
    expression = args.get("expression")

    def evaluate(node: ast.AST) -> Any:
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp) and _BINOPS.get(type(node.op)):
            left, right = evaluate(node.left), evaluate(node.right)
            return _BINOPS[type(node.op)](left, right)
        if isinstance(node, ast.UnaryOp) and _UNARYOPS.get(type(node.op)):
            value = evaluate(node.operand)
            return _UNARYOPS[type(node.op)](value)
        raise ValueError(f"不支持的表达式节点: {type(node).__name__}")

    if not isinstance(expression, str) or not expression.strip():
        raise ValueError("缺少表达式：expression 参数必须为非空字符串")
    value = evaluate(ast.parse(expression.strip(), mode="eval"))
    return {"result": value}


def _get_current_time_run(_args: Dict[str, Any]) -> Dict[str, Any]:
    """返回当前时间。"""
    return {"time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}


# 运算器映射（安全求值用）
_BINOPS: Dict[type, Callable[[Any, Any], Any]] = {
    ast.Add: lambda a, b: a + b,
    ast.Sub: lambda a, b: a - b,
    ast.Mult: lambda a, b: a * b,
    ast.Div: lambda a, b: a / b,
    ast.FloorDiv: lambda a, b: a // b,
    ast.Mod: lambda a, b: a % b,
    ast.Pow: lambda a, b: a ** b,
}
_UNARYOPS: Dict[type, Callable[[Any], Any]] = {
    ast.UAdd: lambda v: +v,
    ast.USub: lambda v: -v,
}


# ---------------------------------------------------------------------------
# 工具注册表
# ---------------------------------------------------------------------------

TOOLS: Dict[str, Dict[str, Any]] = {
    "calculator": {
        "schema": {
            "type": "function",
            "function": {
                "name": "calculator",
                "description": "计算数学表达式，支持 + - * / // % ** 和括号",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "expression": {
                            "type": "string",
                            "description": "要计算的数学表达式，例如 23*17",
                        }
                    },
                    "required": ["expression"],
                },
            },
        },
        "run": _calculator_run,
    },
    "get_current_time": {
        "schema": {
            "type": "function",
            "function": {
                "name": "get_current_time",
                "description": "返回当前时间",
                "parameters": {"type": "object", "properties": {}},
            },
        },
        "run": _get_current_time_run,
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