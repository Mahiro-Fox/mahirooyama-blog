import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

// 用户角色类型
export type UserRole = 'super_admin' | 'user';

// 用户数据接口
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  // 用户自定义权限（可选，用于覆盖默认权限）
  permissions?: {
    canCreate?: boolean;
    canRead?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  };
}

// 创建用户请求接口
export interface CreateUserRequest {
  username: string;
  password: string;
  role: UserRole;
  permissions?: User['permissions'];
}

// 更新用户请求接口
export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role?: UserRole;
  permissions?: User['permissions'];
}

// 用户响应（不含密码）
export interface UserResponse {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  permissions?: User['permissions'];
}

// 权限检查工具
export class PermissionChecker {
  // 获取用户实际权限
  static getUserPermissions(user: User): {
    canCreate: boolean;
    canRead: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  } {
    // super_admin 拥有所有权限
    if (user.role === 'super_admin') {
      return {
        canCreate: true,
        canRead: true,
        canUpdate: true,
        canDelete: true,
      };
    }

    // user 默认权限：可创建、可读，不可修改、不可删除
    // 但可以被自定义权限覆盖
    return {
      canCreate: user.permissions?.canCreate ?? true,
      canRead: user.permissions?.canRead ?? true,
      canUpdate: user.permissions?.canUpdate ?? false,
      canDelete: user.permissions?.canDelete ?? false,
    };
  }

  // 检查用户是否有特定权限
  static hasPermission(
    user: User,
    action: 'create' | 'read' | 'update' | 'delete'
  ): boolean {
    const perms = this.getUserPermissions(user);
    switch (action) {
      case 'create':
        return perms.canCreate;
      case 'read':
        return perms.canRead;
      case 'update':
        return perms.canUpdate;
      case 'delete':
        return perms.canDelete;
    }
  }
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// 确保数据目录和文件存在
async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  try {
    await fs.access(USERS_FILE);
  } catch {
    // 创建默认的超级管理员
    const defaultAdmin: User = {
      id: crypto.randomUUID(),
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'super_admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(USERS_FILE, JSON.stringify([defaultAdmin], null, 2));
  }
}

// 读取所有用户
async function readUsers(): Promise<User[]> {
  await ensureDataFile();
  const data = await fs.readFile(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

// 写入所有用户
async function writeUsers(users: User[]): Promise<void> {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// 转换为响应格式（移除密码）
function toUserResponse(user: User): UserResponse {
  const { passwordHash, ...response } = user;
  return response;
}

export const userStore = {
  // 获取所有用户
  async getAll(): Promise<UserResponse[]> {
    const users = await readUsers();
    return users.map(toUserResponse);
  },

  // 根据ID获取用户
  async getById(id: string): Promise<User | null> {
    const users = await readUsers();
    return users.find((u) => u.id === id) || null;
  },

  // 根据用户名获取用户
  async getByUsername(username: string): Promise<User | null> {
    const users = await readUsers();
    return users.find((u) => u.username === username) || null;
  },

  // 验证用户密码
  async verifyPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getByUsername(username);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  },

  // 创建用户
  async create(request: CreateUserRequest): Promise<UserResponse> {
    const users = await readUsers();

    // 检查用户名是否已存在
    if (users.some((u) => u.username === request.username)) {
      throw new Error('用户名已存在');
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username: request.username,
      passwordHash: await bcrypt.hash(request.password, 10),
      role: request.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      permissions: request.permissions,
    };

    users.push(newUser);
    await writeUsers(users);

    return toUserResponse(newUser);
  },

  // 更新用户
  async update(id: string, request: UpdateUserRequest): Promise<UserResponse | null> {
    const users = await readUsers();
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) return null;

    const user = users[index];

    // 如果更新用户名，检查是否与其他用户冲突
    if (request.username && request.username !== user.username) {
      if (users.some((u) => u.username === request.username && u.id !== id)) {
        throw new Error('用户名已存在');
      }
    }

    // 更新字段
    if (request.username) user.username = request.username;
    if (request.password) user.passwordHash = await bcrypt.hash(request.password, 10);
    if (request.role) user.role = request.role;
    if (request.permissions !== undefined) user.permissions = request.permissions;
    user.updatedAt = new Date().toISOString();

    await writeUsers(users);
    return toUserResponse(user);
  },

  // 删除用户
  async delete(id: string): Promise<boolean> {
    const users = await readUsers();
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) return false;

    // 禁止删除最后一个 super_admin
    const superAdminCount = users.filter((u) => u.role === 'super_admin').length;
    if (users[index].role === 'super_admin' && superAdminCount <= 1) {
      throw new Error('不能删除唯一的超级管理员');
    }

    users.splice(index, 1);
    await writeUsers(users);
    return true;
  },

  // 初始化：如果没有任何用户，创建默认超级管理员
  async initialize(): Promise<void> {
    await ensureDataFile();
  },
};
