/**
 * 后台用户（admin_users）类型
 *
 * 数据由 Go 后端管理，本模块只声明形状，取数逻辑见 src/store/user-store.ts。
 */

// 用户角色类型
export type UserRole = 'super_admin' | 'user';

// 用户数据接口（含密码哈希，仅服务端使用）
export interface User {
  id: string;
  username: string;
  avatar: string;
  passwordHash: string;
  role: UserRole;
  lastUpdated: string;
  mustChangePassword?: boolean;
}

// 创建用户请求接口
export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  mustChangePassword?: boolean;
}

// 更新用户请求接口
export interface UpdateUserRequest {
  username?: string;
  password?: string;
  avatar?: string;
  role?: UserRole;
  mustChangePassword?: boolean;
}

// 用户响应（不含密码）
export interface UserResponse {
  id: string;
  username: string;
  avatar: string;
  role: UserRole;
  lastUpdated: string;
  mustChangePassword?: boolean;
}

// Go 后端返回的 AdminUser（passwordHash 通过 json:"-" 不会返回，因此前端拿不到哈希）
// 登录/校验密码由 Go 完成，前端不再保留 passwordHash。