/**
 * 身份透传上下文
 *
 * 数据流向：Server Action 鉴权通过后构造 ctx → 显式传入 store 方法 →
 * store 用 withGoAuth(ctx) 转成 `Authorization: Bearer <token>` → goFetch 透传给 Go。
 * Go 侧 RequireSession 解析该 JWT 得到 userId/role，RequirePermission 据此授权。
 */
export type ActionContext = {
  /** 当前登录用户的 JWT（后台来自 admin-session，前台来自 user-session） */
  authToken: string;
};