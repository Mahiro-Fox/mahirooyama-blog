import { type UserRole } from '@/store/user-store';

/**
 * RBAC 权限系统
 * 权限命名规范: <模块>:<操作>
 * 模块: users, blog, gallery, files, system
 * 操作: read, create, update, delete, special (特殊操作)
 */
export type Permission =
  // 用户管理权限
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:updateRole' // 修改角色（仅super_admin）
  | 'users:updatePassword' // 修改密码
  // 博客管理权限
  | 'blog:read'
  | 'blog:create'
  | 'blog:update'
  | 'blog:delete'
  // 图库管理权限
  | 'gallery:read'
  | 'gallery:create'
  | 'gallery:update'
  | 'gallery:delete'
  // 标签管理权限
  | 'tag:read'
  | 'tag:create'
  | 'tag:update'
  | 'tag:delete'
  | 'tag:reset'
  // 文件管理权限
  | 'files:read'
  | 'files:upload'
  | 'files:update'
  | 'files:delete'
  | 'files:manageFolder'
  // MIDI 文件管理权限
  | 'midi:read'
  | 'midi:create'
  | 'midi:update'
  | 'midi:delete'
  // 碎碎念管理权限
  | 'moments:read'
  | 'moments:create'
  | 'moments:update'
  | 'moments:delete'
  // 留言墙管理权限
  | 'guestbook:read'
  | 'guestbook:create'
  | 'guestbook:update'
  | 'guestbook:delete'
  | 'guestbook:approve'
  // 分析权限
  | 'analytics:read'
  // 系统权限
  | 'system:revalidate'
  | 'system:convertImages'
  | '*'; // 所有权限（超级管理员）

/**
 * 默认角色权限配置
 * 实际运行时从 data/role-permissions.json 加载
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: ['*'], // 超级管理员拥有所有权限

  user: [
    // 用户权限：只能查看用户列表和修改自己的密码
    'users:read',
    'users:updatePassword',

    // 博客权限：完整的CRUD
    'blog:read',
    'blog:create',
    'blog:update',
    'blog:delete',

    // 图库权限：完整的CRUD
    'gallery:read',
    'gallery:create',
    'gallery:update',
    'gallery:delete',

    // 标签权限：完整的CRUD
    'tag:read',
    'tag:create',
    'tag:update',
    'tag:delete',
    'tag:reset',

    // 文件权限：完整的文件管理
    'files:read',
    'files:upload',
    'files:update',
    'files:delete',
    'files:manageFolder',

    // MIDI 文件权限：完整的CRUD
    'midi:read',
    'midi:create',
    'midi:update',
    'midi:delete',

    // 碎碎念权限：完整的CRUD
    'moments:read',
    'moments:create',
    'moments:update',
    'moments:delete',

    // 留言墙权限：完整的CRUD + 审核
    'guestbook:read',
    'guestbook:create',
    'guestbook:update',
    'guestbook:delete',
    'guestbook:approve',

    // 分析权限：只能查看访问日志
    'analytics:read',

    // 系统权限：可以刷新缓存
    'system:revalidate',
  ],
};

/**
 * 所有可用的权限列表（用于前端展示和管理界面）
 */
export const ALL_PERMISSIONS: {
  group: string;
  permissions: { value: Permission; label: string; description: string }[];
}[] = [
  {
    group: '用户管理',
    permissions: [
      { value: 'users:read', label: '查看用户', description: '查看用户列表' },
      {
        value: 'users:create',
        label: '创建用户',
        description: '创建新用户（仅超级管理员）',
      },
      {
        value: 'users:update',
        label: '修改用户',
        description: '修改其他用户信息',
      },
      {
        value: 'users:delete',
        label: '删除用户',
        description: '删除用户（仅超级管理员）',
      },
      {
        value: 'users:updatePassword',
        label: '修改密码',
        description: '修改自己的密码',
      },
      {
        value: 'users:updateRole',
        label: '修改角色',
        description: '修改用户角色（仅超级管理员）',
      },
    ],
  },
  {
    group: '博客管理',
    permissions: [
      {
        value: 'blog:read',
        label: '查看文章',
        description: '查看博客文章列表',
      },
      {
        value: 'blog:create',
        label: '发布文章',
        description: '发布新博客文章',
      },
      {
        value: 'blog:update',
        label: '修改文章',
        description: '修改已有博客文章',
      },
      { value: 'blog:delete', label: '删除文章', description: '删除博客文章' },
    ],
  },
  {
    group: '图库管理',
    permissions: [
      { value: 'gallery:read', label: '查看图库', description: '查看图库列表' },
      { value: 'gallery:create', label: '上传图片', description: '上传新图片' },
      {
        value: 'gallery:update',
        label: '修改图片',
        description: '修改图片信息',
      },
      {
        value: 'gallery:delete',
        label: '删除图片',
        description: '删除图库图片',
      },
    ],
  },
  {
    group: '标签管理',
    permissions: [
      { value: 'tag:read', label: '查看标签', description: '查看标签列表' },
      { value: 'tag:create', label: '创建标签', description: '创建新标签' },
      { value: 'tag:update', label: '修改标签', description: '修改标签信息' },
      { value: 'tag:delete', label: '删除标签', description: '删除标签' },
      { value: 'tag:reset', label: '重置标签', description: '重置为默认标签' },
    ],
  },
  {
    group: '文件管理',
    permissions: [
      { value: 'files:read', label: '查看文件', description: '查看服务器文件' },
      {
        value: 'files:upload',
        label: '上传文件',
        description: '上传文件到服务器',
      },
      {
        value: 'files:update',
        label: '修改文件',
        description: '重命名或移动文件',
      },
      {
        value: 'files:delete',
        label: '删除文件',
        description: '从服务器删除文件',
      },
      {
        value: 'files:manageFolder',
        label: '管理文件夹',
        description: '创建或删除文件夹',
      },
    ],
  },
  {
    group: 'MIDI 管理',
    permissions: [
      {
        value: 'midi:read',
        label: '查看 MIDI',
        description: '查看 MIDI 文件列表',
      },
      {
        value: 'midi:create',
        label: '上传 MIDI',
        description: '上传新 MIDI 文件',
      },
      {
        value: 'midi:update',
        label: '修改 MIDI',
        description: '修改 MIDI 信息',
      },
      {
        value: 'midi:delete',
        label: '删除 MIDI',
        description: '删除 MIDI 文件',
      },
    ],
  },
  {
    group: '碎碎念管理',
    permissions: [
      {
        value: 'moments:read',
        label: '查看碎碎念',
        description: '查看碎碎念列表',
      },
      {
        value: 'moments:create',
        label: '发布碎碎念',
        description: '发布新碎碎念',
      },
      {
        value: 'moments:update',
        label: '修改碎碎念',
        description: '修改碎碎念内容',
      },
      {
        value: 'moments:delete',
        label: '删除碎碎念',
        description: '删除碎碎念',
      },
    ],
  },
  {
    group: '留言墙管理',
    permissions: [
      {
        value: 'guestbook:read',
        label: '查看留言',
        description: '查看留言列表',
      },
      {
        value: 'guestbook:create',
        label: '发布留言',
        description: '发布新留言',
      },
      {
        value: 'guestbook:update',
        label: '修改留言',
        description: '修改留言内容',
      },
      { value: 'guestbook:delete', label: '删除留言', description: '删除留言' },
      {
        value: 'guestbook:approve',
        label: '审核留言',
        description: '审核或取消审核留言',
      },
    ],
  },
  {
    group: '分析管理',
    permissions: [
      {
        value: 'analytics:read',
        label: '查看访问日志',
        description: '查看网站访问日志',
      },
    ],
  },
  {
    group: '系统管理',
    permissions: [
      {
        value: 'system:revalidate',
        label: '刷新缓存',
        description: '手动触发页面重新验证',
      },
    ],
  },
];
