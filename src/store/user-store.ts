import crypto from 'crypto';
import fs from 'fs/promises';
import { DATA_DIR, USERS_FILE } from '@/constant';
import bcrypt from 'bcryptjs';
import { ADMIN_DEFAULT_PASSWORD } from '@/constant/auth';
import {
  ensureDirectory,
  ensureFileInitialized,
  writeFileAtomic,
} from '@/utils/file-utils';

// 用户角色类型
export type UserRole = 'super_admin' | 'user';

// 用户数据接口
export interface User {
  id: string;
  username: string;
  avatar: string;
  passwordHash: string;
  role: UserRole;
  lastUpdated: string;
  // 首次登录是否必须修改密码（用于默认 admin 等初始账号）
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

// 确保数据目录和文件存在
async function ensureDataFile(): Promise<void> {
  await ensureDirectory(DATA_DIR);

  // 创建默认的超级管理员
  const defaultAdmin: User = {
    id: crypto.randomUUID(),
    username: 'admin',
    avatar: '/uploads/images/avatar/default-avatar.webp',
    passwordHash: await bcrypt.hash(ADMIN_DEFAULT_PASSWORD, 10),
    role: 'super_admin',
    lastUpdated: new Date().toISOString(),
    mustChangePassword: true, // 默认账号首次登录必须改密
  };
  await ensureFileInitialized(
    USERS_FILE,
    JSON.stringify([defaultAdmin], null, 2)
  );
}

// 读取所有用户
async function readUsers(): Promise<User[]> {
  await ensureDataFile();
  const data = await fs.readFile(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

// 写入所有用户
async function writeUsers(users: User[]): Promise<void> {
  await writeFileAtomic(USERS_FILE, JSON.stringify(users, null, 2), {
    encoding: 'utf-8',
  });
}

// 转换为响应格式（移除密码）
function toUserResponse(user: User): UserResponse {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  async verifyPassword(
    username: string,
    password: string
  ): Promise<User | null> {
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
      avatar: '/uploads/images/avatar/default-avatar.webp',
      passwordHash: await bcrypt.hash(request.password, 10),
      role: request.role,
      lastUpdated: new Date().toISOString(),
      mustChangePassword: request.mustChangePassword ?? false,
    };

    users.push(newUser);
    await writeUsers(users);

    return toUserResponse(newUser);
  },

  // 更新用户
  async update(
    id: string,
    request: UpdateUserRequest
  ): Promise<UserResponse | null> {
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
    if (request.password) {
      user.passwordHash = await bcrypt.hash(request.password, 10);
      user.mustChangePassword = false; // 修改密码即满足强制改密要求
    }
    if (request.avatar) user.avatar = request.avatar;
    if (request.role) user.role = request.role;
    user.lastUpdated = new Date().toISOString();

    await writeUsers(users);
    return toUserResponse(user);
  },

  // 删除用户
  async delete(id: string): Promise<boolean> {
    const users = await readUsers();
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) return false;

    // 禁止删除最后一个 super_admin
    const superAdminCount = users.filter(
      (u) => u.role === 'super_admin'
    ).length;
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
