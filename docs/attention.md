# 🤖 AI Code Assistant 注意事项文档

> **本文档旨在帮助 AI 在修改代码前快速了解项目架构、规范和约定，避免重复造轮子和违反项目约定。**

---

## 📋 目录

1. [项目架构概览](#1-项目架构概览)
2. [目录结构规范](#2-目录结构规范)
3. [代码组织模式](#3-代码组织模式)
4. [可复用组件清单（重要！）](#4-可复用组件清单重要)
5. [已有工具函数库](#5-已有工具函数库)
6. [配置和常量管理规范](#6-配置和常量管理规范)
7. [Server Actions 使用规范](#7-server-actions-使用规范)
8. [API 路由开发规范](#8-api-路由开发规范)
9. [常见错误和禁忌](#9-常见错误和禁忌)
10. [开发检查清单](#10-开发检查清单)

---

## 1️⃣ 项目架构概览

### 技术栈

- **框架**: Next.js 16 (App Router + Turbopack)
- **语言**: TypeScript (strict mode)
- **样式**: Tailwind CSS v4 + shadcn/ui
- **状态管理**: React useState/useContext (无全局状态库)
- **数据存储**: 文件系统 (JSON/MDX) + Server Actions
- **认证**: JWT + Cookie-based Session

### 核心架构模式

```
┌─────────────────────────────────────────────────────┐
│  Server Components (数据获取层)                       │
│  ├── 权限验证: requirePermission()                   │
│  ├── 数据获取: Server Actions / Store               │
│  └── 通过 props 传递给 Client Components             │
└─────────────────────────────────────────────────────┘
           ↓ props
┌─────────────────────────────────────────────────────┐
│  Client Components (交互层)                          │
│  ├── useState 管理本地 UI 状态                       │
│  ├── 调用 Server Actions 处理业务逻辑                │
│  └── 使用可复用组件渲染 UI                           │
└─────────────────────────────────────────────────────┘
```

**关键原则**:

- ❌ 不要引入 Redux/Zustand 等全局状态管理库
- ✅ 使用 Server Components + Server Actions 模式
- ✅ 数据通过 props 从上往下传递

---

## 2️⃣ 目录结构规范

### 📁 src/ 目录结构

```
src/
├── actions/admin/          # ⭐ Server Actions (服务端业务逻辑)
├── app/
│   ├── (app)/              # 前台页面
│   │   ├── layout.tsx      # App Layout (Server Component)
│   │   ├── blog/[slug]/    # 博客详情页
│   │   └── ...其他页面
│   ├── admin/              # 后台管理页
│   │   ├── layout.tsx      # Admin Layout (权限验证)
│   │   ├── blog/
│   │   │   ├── page.tsx    # Server Component (数据获取)
│   │   │   └── blog-client.tsx  # Client Component (UI交互)
│   │   └── ...
│   └── api/                # API 路由 (RESTful endpoints)
├── components/
│   ├── admin/              # ⭐ 管理后台专用组件 (可复用!)
│   ├── shadcn-ui/          # UI 基础组件 (不要重复创建!)
│   ├── shared/             # ⭐ 全局共享组件 (可复用!)
│   ├── content/            # 内容展示组件
│   └── layout/             # 布局组件
├── config/                 # ⭐ 业务配置 (站点信息、导航等)
├── constant/               # ⭐ 技术常量 (路径、权限等)
├── hooks/                  # 自定义 Hooks
├── lib/                    # 工具库 (核心功能模块)
├── store/                  # 数据访问层 (文件操作)
├── utils/                  # ⭐ 通用工具函数
└── context/                # React Context
```

### 🎯 页面组织模式 (必须遵守!)

每个管理后台页面都遵循 **双文件模式**:

```typescript
// ✅ 正确: admin/blog/page.tsx (Server Component)
export default async function BlogAdminPage() {
  // 1. 权限验证
  const permissionCheck = await requirePermission('blog:read');

  // 2. 数据获取 (调用 Server Action)
  const result = await adminGetBlogFiles();

  // 3. 传递给 Client Component
  return <BlogClient initialFiles={result.data} />;
}

// ✅ 正确: admin/blog/blog-client.tsx (Client Component)
'use client';
export default function BlogClient({ initialFiles }) {
  // 本地状态管理 + UI 交互
}
```

**❌ 错误做法**:

- 不要在 Client Component 中直接读取文件系统
- 不要跳过权限验证
- 不要将所有逻辑写在一个文件中

---

## 3️⃣ 代码组织模式

### 3.1 组件命名规范

| 类型             | 命名规则            | 示例                                      |
| ---------------- | ------------------- | ----------------------------------------- |
| Server Component | `PascalCase`        | `BlogAdminPage`, `AboutPage`              |
| Client Component | `*client.tsx`       | `blog-client.tsx`, `analytics-client.tsx` |
| 共享组件         | `PascalCase`        | `TagPicker`, `DataTable`                  |
| 页面子组件       | `_components/*.tsx` | `home-banner.tsx`, `profile-card.tsx`     |

### 3.2 导入路径别名

```typescript
// ✅ 使用 @/ 别名
import { Button } from '@/components/shadcn-ui/button';
import { cn } from '@/utils/utils';
import { BLOG_DIR } from '@/constant/dir';

// ❌ 不要使用相对路径
import { Button } from '../../../components/shadcn-ui/button';
```

### 3.3 文件导出规范

```typescript
// config/index.ts - 统一导出
export * from './config'; // siteConfig, pageRoutesConfig
export * from './tag-config'; // tag 相关配置
export * from './moods'; // 心情配置
export * from './ui'; // UI 配置
export * from './limit'; // 限制配置

// constant/index.ts - 统一导出
export * from './dir'; // 路径常量
export * from './auth'; // 认证常量
export * from './cache'; // 缓存常量
export * from './form'; // 表单常量
export * from './tag'; // 标签常量
export * from './permissions'; // 权限定义
```

---

## 4️⃣ 可复用组件清单（重要！）

> ⚠️ **AI 开发时必须优先使用这些组件，不要重复创建！**

### 4.1 🎯 管理后台专用组件 (`src/components/admin/`)

#### ✅ AdminPageLayout - 管理页面布局

```typescript
// ✅ 使用示例
import {
  AdminPageLayout,
  createRefreshAction,
  createAddAction
} from '@/components/admin/admin-page-layout';

<AdminPageLayout
  title="博客管理"
  description="共 10 篇文章"
  actions={[
    createRefreshAction(fetchItems, loading),
    createAddAction(() => openCreateDialog(), '新建文章'),
  ]}
>
  {/* 内容区域 */}
</AdminPageLayout>
```

**适用场景**: 所有管理后台页面的统一布局

---

#### ✅ DataTable - 通用数据表格 (带虚拟滚动)

```typescript
// ✅ 使用示例
import { Column, DataTable } from '@/components/admin/data-table';

const columns: Column<BlogPost>[] = [
  {
    key: 'title',
    header: '标题',
    render: (post) => <strong>{post.title}</strong>,
  },
  {
    key: 'date',
    header: '日期',
    render: (post) => formatDate(post.date),
  },
];

<DataTable
  data={posts}
  columns={columns}
  keyExtractor={(post) => post.id}
  onEdit={(post) => handleEdit(post)}
  onDelete={(post) => handleDelete(post)}
  virtual={true}  // 启用虚拟滚动
  virtualOptions={{ maxHeight: '65vh' }}
/>
```

**特性**:

- 支持虚拟滚动 (@tanstack/react-virtual)
- 内置编辑/删除按钮
- 支持 loading/empty 状态
- 列宽自定义

---

#### ✅ CrudFormDialog - CRUD 表单对话框

```typescript
// ✅ 使用示例
import { CrudFormDialog } from '@/components/admin/crud-form-dialog';

<CrudFormDialog
  open={isCreateDialogOpen}
  onOpenChange={setIsCreateDialogOpen}
  title="新建文章"
  description="填写文章信息"
  onSubmit={handleSubmit}
  isSubmitting={submitting}
  submitLabel="创建"
>
  <Input ... />
  <Textarea ... />
</CrudFormDialog>
```

**适用场景**: 创建/编辑表单对话框

---

#### ✅ DeleteConfirmDialog - 删除确认对话框

```typescript
// ✅ 使用示例
import { DeleteConfirmDialog } from '@/components/admin/delete-confirm-dialog';

<DeleteConfirmDialog
  open={isDeleteDialogOpen}
  onOpenChange={setIsDeleteDialogOpen}
  itemName={selectedItem?.title}
  onConfirm={() => handleDelete(selectedItem.id)}
  isLoading={deleting}
/>
```

---

#### ✅ FileUploadTrigger - 文件上传触发器

```typescript
// ✅ 使用示例
import { FileUploadTrigger } from '@/components/admin/file-upload-trigger';

<FileUploadTrigger
  onFileSelect={(files) => handleUpload(files)}
  accept=".mdx,.md"
  multiple={false}
  maxSize={10 * 1024 * 1024}  // 10MB
/>
```

---

#### ✅ EditorDialog - 编辑器对话框 (MDX编辑)

```typescript
import { EditorDialog } from '@/components/admin/editor-dialog';

<EditorDialog
  open={isEditorOpen}
  onOpenChange={setIsEditorOpen}
  initialContent={content}
  onSave={(newContent) => handleSave(newContent)}
  language="markdown"
/>
```

---

### 4.2 🎯 全局共享组件 (`src/components/shared/`)

#### ✅ TagPicker - 标签选择器

```typescript
import { TagPicker } from '@/components/shared/tag-picker';

<TagPicker
  value={selectedTags}
  onChange={setSelectedTags}
  type="blog"  // "blog" | "gallery"
/>
```

---

#### ✅ ImagePreviewProvider - 图片预览提供者

```typescript
import { ImagePreviewProvider } from '@/components/shared/image-preview-provider';

<ImagePreviewProvider>
  <img onClick={() => previewImage(url)} />
</ImagePreviewProvider>
```

---

#### ✅ OptimizedImage - 优化图片组件

```typescript
import { OptimizedImage } from '@/components/shared/optimized-image';

<OptimizedImage
  src="/uploads/images/photo.webp"
  alt="描述"
  width={800}
  height={600}
  priority={false}
/>
```

---

#### ✅ Pagination - 分页组件

```typescript
import { Pagination } from '@/components/shared/pagination';

<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={(newPage) => setPage(newPage)}
/>
```

---

#### ✅ LinkCard, FadeCarousel, IconPicker 等

查看 `src/components/shared/` 目录获取完整列表

---

### 4.3 🎯 shadcn/ui 基础组件 (`src/components/shadcn-ui/`)

**已包含的完整组件列表**:

- `Button`, `Input`, `Label`, `Textarea`, `Select`
- `Dialog`, `AlertDialog`, `Sheet`
- `Table`, `Card`, `Badge`, `Separator`
- `Tabs`, `Tooltip`, `NavigationMenu`
- `Carousel`, `Marquee`, `Spinner`
- `TextAnimate`, `TypingAnimation`, `BlurFade`
- `Breadcrumb`, `Pagination`
- ... 更多

**❌ 不要重复创建这些基础 UI 组件！**

---

## 5️⃣ 已有工具函数库

### 5.1 通用工具 (`src/utils/utils.ts`)

```typescript
import {
  cn,                    // CSS 类名合并 (clsx + tailwind-merge)
  formatDate,            // 格式化日期 (2024/1/1)
  formatDateWithHMS,  // 格式化日期+时间 (2024/1/1 12:00:00)
  absoluteUrl,           // 生成绝对 URL
  truncateText,          // 截断文本 (添加...)
  debounce,              // 防抖函数
  throttle,              // 节流函数
  formatSize,            // 格式化文件大小 (B/KB/MB)
} from '@/utils/utils';

// ✅ 使用示例
<div className={cn('base-class', isActive && 'active-class')}>
<span>{formatDate('2024-01-01')}</span>
<span>{formatSize(1024 * 1024)}</span>  // "1.0 MB"
```

---

### 5.2 文件工具 (`src/utils/file-utils.ts`)

```typescript
import {
  checkFileConflict, // 检查文件名冲突
  ensureDirectory, // 确保目录存在
  ensureFileInitialized, // 确保文件初始化
  fileExists, // 检查文件是否存在
  isPathSafe, // 路径安全检查 (防目录遍历)
  validateSlug, // 验证 slug 合法性
} from '@/utils/file-utils';
```

---

### 5.3 图片工具 (`src/utils/image-utils.ts`)

```typescript
import {
  processAndSaveImage, // 处理并保存图片 (压缩/转换)
} from '@/utils/image-utils';
```

---

### 5.4 日志工具 (`src/utils/logger.ts`)

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('ModuleName');

logger.info('操作成功', { userId: '123' });
logger.error('操作失败', error, { context: '额外信息' });
logger.warn('警告信息');
logger.debug('调试信息'); // 仅 development 环境
```

---

### 5.5 API 响应工具 (`src/utils/api-response.ts`)

```typescript
import { ApiResponse } from '@/utils/api-response';

// 在 API Route 中使用
return ApiResponse.success(data);
return ApiResponse.error('错误信息', 400);
return ApiResponse.notFound();
return ApiResponse.unauthorized();
return ApiResponse.forbidden();
return ApiResponse.internalError();
return ApiResponse.created(data, '创建成功');
return ApiResponse.badRequest('参数错误', details);
```

---

### 5.6 Action 响应工具 (`src/utils/action-response.ts`)

```typescript
import { withActionPermission } from '@/utils/action-response';

// 在 Server Actions 中使用
export async function myAction() {
  return withActionPermission('blog:read', async (user) => {
    // 业务逻辑
    return { success: true, data: result };
  });
}
```

---

### 5.7 自定义 Hooks (`src/hooks/`)

```typescript
import { useCrud } from '@/hooks/use-crud'; // CRUD 操作 Hook
import { useMediaQuery } from '@/hooks/use-media-query'; // 媒体查询
import { useMidiPlayer } from '@/hooks/use-midi-player'; // MIDI 播放器
import { usePhotos } from '@/hooks/use-photos'; // 照片管理
import { useSearch } from '@/hooks/use-search'; // 搜索功能
```

---

## 6️⃣ 配置和常量管理规范

### ⚠️ 重要：不要在其他文件中硬编码配置！

#### 6.1 Config 目录 (`src/config/`) - **业务配置**

**存放内容**:

- 站点信息 (名称、描述、链接)
- 导航菜单配置
- UI 展示选项
- 业务规则配置

**✅ 正确做法**:

```typescript
// src/config/config.ts
export const siteConfig = {
  name: 'mahirooyama-blog',
  url: 'https://mahirooyama.cn/',
  links: { github: '...', twitter: '...' },
};

export const COMPRESSION_CONFIG = {
  quality: 80,
  maxWidth: 1920,
  maxHeight: 1920,
};
```

**❌ 错误做法**:

```typescript
// 不要在其他文件中硬编码!
const SITE_URL = 'https://mahirooyama.cn/'; // ❌ 应该放在 config 中
const MAX_WIDTH = 1920; // ❌ 应该放在 config 中
```

---

#### 6.2 Constant 目录 (`src/constant/`) - **技术常量**

**存放内容**:

- 文件系统路径
- 权限定义
- 缓存配置
- 认证相关常量
- 表单验证规则

**✅ 正确做法**:

```typescript
// src/constant/dir.ts
export const DATA_DIR = path.join(process.cwd(), 'data');
export const BLOG_DIR = path.join(UPLOADS_DIR, 'content', 'blog');
export const ANALYTICS_RETENTION_DAYS = 30;

// src/constant/permissions.ts
export type Permission = 'blog:read' | 'blog:create' | ...;
```

**❌ 错误做法**:

```typescript
// 不要硬编码路径!
const blogDir = './uploads/content/blog'; // ❌ 应该从 constant 导入

// 不要直接写数字!
const retentionDays = 30; // ❌ 应该定义在 constant 中
```

---

### 6.3 新增配置的流程

当需要添加新配置时:

1. **判断类型**:

   - 业务/UI 相关 → `src/config/`
   - 技术/底层相关 → `src/constant/`

2. **创建文件**:

   ```typescript
   // src/config/my-feature.ts
   export const MY_FEATURE_CONFIG = { ... };

   // 或 src/constant/my-feature.ts
   export const MY_FEATURE_CONSTANT = ...;
   ```

3. **更新 index.ts 导出**:

   ```typescript
   // src/config/index.ts
   export * from './my-feature';
   ```

4. **在代码中导入使用**:
   ```typescript
   import { MY_FEATURE_CONFIG } from '@/config';
   ```

---

## 7️⃣ Server Actions 使用规范

### 7.1 Server Actions 的位置

所有 Server Actions 都放在 `src/actions/admin/` 目录下。

**命名规范**: `admin{Module}{Action}.ts`

```bash
src/actions/admin/
├── analytics-actions.ts    # 分析相关
├── auth.ts                 # 认证相关
├── blog-actions.ts         # 博客相关
├── gallery-actions.ts      # 图库相关
├── guestbook-actions.ts    # 留言墙相关
├── midi-actions.ts         # MIDI 相关
├── moments-actions.ts      # 碎碎念相关
├── tag-actions.ts          # 标签相关
├── upload-files-actions.ts # 文件上传
├── user-actions.ts         # 用户管理
└── ...
```

### 7.2 Server Actions 模板

```typescript
'use server';

import fs from 'fs/promises';
import { BLOG_DIR } from '@/constant/dir';
import { withActionPermission, type ActionResponse } from '@/utils/action-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MyFeature');

export interface MyData {
  id: string;
  name: string;
}

// GET - 获取数据
export async function adminGetMyData(): Promise<ActionResponse<MyData[]>> {
  return withActionPermission('my-feature:read', async () => {
    try {
      // 业务逻辑
      const data = await fs.readFile(...);

      logger.info('获取数据成功', { count: data.length });
      return { success: true, data };
    } catch (error) {
      logger.error('获取数据失败', error);
      return { success: false, error: '获取数据失败' };
    }
  });
}

// POST - 创建数据
export async function adminCreateMyData(
  input: CreateInput
): Promise<ActionResponse<MyData>> {
  return withActionPermission('my-feature:create', async () => {
    try {
      // 业务逻辑

      logger.info('创建数据成功', { id: newData.id });
      return { success: true, data: newData, message: '创建成功' };
    } catch (error) {
      logger.error('创建数据失败', error);
      return { success: false, error: '创建失败' };
    }
  });
}

// DELETE - 删除数据
export async function adminDeleteMyData(
  id: string
): Promise<ActionResponse<void>> {
  return withActionPermission('my-feature:delete', async () => {
    try {
      // 业务逻辑

      logger.info('删除数据成功', { id });
      return { success: true, message: '删除成功' };
    } catch (error) {
      logger.error('删除数据失败', error);
      return { success: false, error: '删除失败' };
    }
  });
}
```

### 7.3 关键要点

- ✅ 必须以 `'use server'` 开头
- ✅ 使用 `withActionPermission()` 包装进行权限验证
- ✅ 返回类型为 `ActionResponse<T>`
- ✅ 使用 `createLogger` 记录日志
- ✅ 异步操作使用 `try-catch` 包裹
- ❌ 不要在 Server Action 中操作 DOM
- ❌ 不要使用浏览器专属 API

---

## 8️⃣ API 路由开发规范

### 8.1 API 路由的位置

所有 API 路由都放在 `src/app/api/` 目录下。

```bash
src/app/api/
├── analytics/route.ts          # GET, DELETE
├── auth/verify/route.ts        # POST
├── bilibili-parse/route.ts     # POST
├── convert-images/route.ts     # POST
├── gallery-files/route.ts      # GET
├── image/process/route.ts      # POST
├── login/route.ts              # POST
├── logout/route.ts             # POST
├── mdx-files/route.ts          # GET, POST, DELETE
├── midi/route.ts               # GET, POST, DELETE
├── revalidate/route.ts         # POST
├── search/route.ts             # GET
├── tags/route.ts               # GET, POST, DELETE
├── upload-files/route.ts       # GET, POST, DELETE
└── users/route.ts              # GET, POST, PATCH, DELETE
```

### 8.2 API Route 模板

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/permissions';
import { ApiResponse } from '@/utils/api-response';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MyAPI');

// GET - 获取资源列表
export async function GET(request: NextRequest) {
  try {
    // 1. 权限验证
    const permissionCheck = await requirePermission('my-feature:read');
    if (!permissionCheck.allowed) {
      return permissionCheck.response || ApiResponse.forbidden();
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');

    // 3. 业务逻辑
    const data = await fetchData(page);

    // 4. 返回响应
    logger.info('GET 请求成功', { count: data.length });
    return ApiResponse.success(data);
  } catch (error) {
    logger.error('GET 请求失败', error);
    return ApiResponse.internalError(
      error instanceof Error ? error.message : '服务器内部错误'
    );
  }
}

// POST - 创建资源
export async function POST(request: NextRequest) {
  try {
    // 1. 权限验证
    const permissionCheck = await requirePermission('my-feature:create');
    if (!permissionCheck.allowed) {
      return permissionCheck.response || ApiResponse.forbidden();
    }

    // 2. 解析请求体
    const body = await request.json();

    // 3. 验证输入
    if (!body.name) {
      return ApiResponse.badRequest('名称不能为空');
    }

    // 4. 业务逻辑
    const newItem = await createItem(body);

    // 5. 返回响应
    logger.info('POST 请求成功', { id: newItem.id });
    return ApiResponse.created(newItem, '创建成功');
  } catch (error) {
    logger.error('POST 请求失败', error);
    return ApiResponse.internalError();
  }
}

// DELETE - 删除资源
export async function DELETE(request: NextRequest) {
  // 类似模式...
}
```

### 8.3 安全要求

- ✅ 所有 API 都需要权限验证
- ✅ 文件操作必须使用 `isPathSafe()` 检查路径
- ✅ 文件上传必须验证 MIME 类型和大小
- ✅ 用户输入必须进行校验和清理
- ❌ 不要信任客户端传来的任何数据

---

## 9️⃣ 常见错误和禁忌

### 🔴 严重错误 (会导致问题)

#### ❌ 1. 重复创建已有组件

```typescript
// ❌ 错误: 创建新的按钮组件
function MyButton({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>;
}

// ✅ 正确: 使用已有的 Button 组件
import { Button } from '@/components/shadcn-ui/button';
<Button onClick={handleClick}>点击我</Button>
```

**常见被重复创建的组件**:

- Button, Input, Dialog, Card (shadcn/ui 已包含)
- DataTable, AdminPageLayout, CrudFormDialog (admin 组件)
- TagPicker, Pagination, ImagePreview (shared 组件)

---

#### ❌ 2. 在错误位置添加配置

```typescript
// ✅ 正确: 从 config/constant 导入
import { API_CONFIG } from '@/config';
import { MAX_RETRIES } from '@/constant';

// ❌ 错误: 直接在组件中硬编码
function MyComponent() {
  const apiUrl = 'https://api.example.com'; // ❌ 应该在 config 中
  const maxRetries = 3; // ❌ 应该在 config/constant 中
}
```

---

#### ❌ 3. 不遵循页面双文件模式

```typescript
// ❌ 错误: 将所有逻辑写在 page.tsx
// app/admin/my-feature/page.tsx
export default function MyPage() {
  const [data, setData] = useState([]);  // ❌ 不要在 Server Component 中使用 useState

  useEffect(() => {
    fetch('/api/data').then(setData);     // ❌ 不要在 Server Component 中使用 useEffect
  }, []);

  return <div>...</div>;
}

// ✅ 正确: 分离 Server 和 Client 组件
// app/admin/my-feature/page.tsx (Server Component)
export default async function MyPage() {
  const data = await adminGetData();  // ✅ 在这里获取数据
  return <MyClient initialData={data} />;
}

// my-client.tsx (Client Component)
'use client';
export default function MyClient({ initialData }) {
  const [data, setData] = useState(initialData);  // ✅ 在这里管理状态
}
```

---

#### ❌ 4. 跳过权限验证

```typescript
// ❌ 错误: 没有权限检查
export async function GET() {
  const data = await sensitiveOperation(); // 危险!
  return NextResponse.json(data);
}

// ✅ 正确: 始终验证权限
export async function GET() {
  const permissionCheck = await requirePermission('my-feature:read');
  if (!permissionCheck.allowed) {
    return ApiResponse.forbidden();
  }

  const data = await sensitiveOperation();
  return ApiResponse.success(data);
}
```

---

#### ❌ 5. 使用 console.log 而非结构化日志

```typescript
// ✅ 正确: 使用 Logger
import { createLogger } from '@/utils/logger';

// ❌ 错误: 使用 console.log
console.log('用户登录:', user); // 生产环境会泄露敏感信息
console.error('错误:', error);

const logger = createLogger('Auth');

logger.info('用户登录成功', { userId: user.id }); // 结构化日志
logger.error('登录失败', error, { username }); // 自动记录堆栈
```

---

#### ❌ 6. 不安全的文件操作

```typescript
// ❌ 错误: 未验证路径安全性
const filePath = path.join(baseDir, userInput);
await fs.readFile(filePath); // 可能导致目录遍历攻击!

// ✅ 正确: 使用 isPathSafe 验证
import { isPathSafe } from '@/utils/file-utils';

const filePath = path.join(baseDir, userInput);
if (!isPathSafe(filePath, baseDir)) {
  return ApiResponse.badRequest('非法路径');
}
await fs.readFile(filePath);
```

---

### 🟡 中等错误 (影响代码质量)

#### ❌ 7. 过度使用 useEffect

```typescript
// ❌ 错误: 不必要地使用 useEffect
useEffect(() => {
  setFormattedDate(formatDate(date));  // 可以直接计算
}, [date]);

// ✅ 正确: 直接计算或使用 useMemo
const formattedDate = useMemo(() => formatDate(date), [date]);
// 或者直接在 JSX 中
<span>{formatDate(date)}</span>
```

---

#### ❌ 8. Props drilling 过深

```typescript
// ❌ 错误: 传递多层 props
<Layout>
  <Page>
    <Section>
      <Card>
        <Button onClick={onRemoteAction}>  // 回调传递了 4 层
          点击
        </Button>
      </Card>
    </Section>
  </Page>
</Layout>

// ✅ 正确: 使用 Context 或提升状态
// 对于这种情况，考虑将状态提升到合适的层级
```

---

#### ❌ 9. 不处理加载和错误状态

```typescript
// ❌ 错误: 没有处理 loading/error
const [data, setData] = useState([]);
useEffect(() => {
  fetchData().then(setData);  // 如果请求失败呢?
}, []);

// ✅ 正确: 完整的状态管理
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetchData()
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);

if (loading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
```

---

### 🟢 轻微错误 (代码风格问题)

#### ❌ 10. 不一致的导入顺序

```typescript
// ❌ 错误: 混乱的导入顺序
import { Card } from '@/components/shadcn-ui/card';
import React from 'react';
import { formatDate } from '@/utils/utils';
import { Button } from '@/components/shadcn-ui/button';

// ✅ 正确: 按照 prettier 配置的顺序
import React from 'react';
import { Button } from '@/components/shadcn-ui/button';
import { Card } from '@/components/shadcn-ui/card';
import { formatDate } from '@/utils/utils';
```

**注意**: 项目已配置 `@ianvs/prettier-plugin-sort-imports`，保存时会自动排序。

---

## 🔟 开发检查清单

在提交代码前，请确保：

### ✅ 架构层面

- [ ] 是否遵循了页面双文件模式 (Server + Client)?
- [ ] 是否使用了已有的可复用组件?
- [ ] 配置是否放在了正确的位置 (config/constant)?
- [ ] 是否使用了 `@/` 路径别名?

### ✅ 安全层面

- [ ] Server Action/API 是否进行了权限验证?
- [ ] 文件操作是否使用了 `isPathSafe()`?
- [ ] 用户输入是否进行了验证和清理?
- [ ] 敏感信息是否通过日志泄露?

### ✅ 代码质量

- [ ] 是否使用了结构化日志 (`createLogger`)?
- [ ] 是否正确处理了异步操作的错误?
- [ ] 是否避免了 `console.log`?
- [ ] 类型是否完整 (TypeScript strict)?

### ✅ 性能层面

- [ ] 大数据列表是否使用了虚拟滚动 (DataTable)?
- [ ] 图片是否使用了 `OptimizedImage`?
- [ ] 是否有不必要的 re-render?

### ✅ 一致性

- [ ] 命名是否符合项目规范?
- [ ] 文件是否放在了正确的目录?
- [ ] 是否导出到了 index.ts (如果是新模块)?

---

## 📚 补充资源

### 项目关键文件速查

| 用途       | 文件路径                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------- |
| 站点配置   | [src/config/config.ts](src/config/config.ts)                                             |
| 路径常量   | [src/constant/dir.ts](src/constant/dir.ts)                                               |
| 权限定义   | [src/constant/permissions.ts](src/constant/permissions.ts)                               |
| 通用工具   | [src/utils/utils.ts](src/utils/utils.ts)                                                 |
| 日志工具   | [src/utils/logger.ts](src/utils/logger.ts)                                               |
| 文件工具   | [src/utils/file-utils.ts](src/utils/file-utils.ts)                                       |
| API响应    | [src/utils/api-response.ts](src/utils/api-response.ts)                                   |
| Action响应 | [src/utils/action-response.ts](src/utils/action-response.ts)                             |
| 管理布局   | [src/components/admin/admin-page-layout.tsx](src/components/admin/admin-page-layout.tsx) |
| 数据表格   | [src/components/admin/data-table.tsx](src/components/admin/data-table.tsx)               |
| CRUD表单   | [src/components/admin/crud-form-dialog.tsx](src/components/admin/crud-form-dialog.tsx)   |
| CRUD Hook  | [src/hooks/use-crud.ts](src/hooks/use-crud.ts)                                           |
| 权限验证   | [src/lib/permissions.ts](src/lib/permissions.ts)                                         |
| 认证模块   | [src/lib/admin-auth.ts](src/lib/admin-auth.ts)                                           |

---

## 🎯 快速决策树

```
需要创建新组件？
├─ 是基础 UI 组件？ → 使用 shadcn/ui (Button, Input, Dialog...)
├─ 是管理后台组件？ → 查看 components/admin/ (DataTable, AdminPageLayout...)
├─ 是共享业务组件？ → 查看 components/shared/ (TagPicker, Pagination...)
└─ 都没有？ → 创建新组件并放在合适的位置

需要添加配置？
├─ 是业务/UI 配置？ → src/config/xxx.ts
├─ 是技术/底层常量？ → src/constant/xxx.ts
└─ 更新对应的 index.ts 导出

需要数据交互？
├─ 服务端操作？ → 创建 Server Action (actions/admin/)
├─ RESTful API？ → 创建 API Route (app/api/)
└─ 客户端状态？ → useState (不需要全局状态库)

需要日志记录？
├─ 服务端日志？ → createLogger('ModuleName')
└─ 客户端提示？ → toast.success/error/warning (sonner)
```

---

## 💡 最后的建议

1. **先搜索，再创建**
   - 使用 IDE 搜索功能查找是否有类似组件
   - 查看本文档的可复用组件清单
2. **阅读现有代码**
   - 参考同类型的页面实现 (如 blog-client.tsx)
   - 遵循已有的模式和约定
3. **保持一致性**
   - 如果不确定，选择与现有代码一致的方式
   - 宁可多导入一个现有工具，也不要重新实现
4. **小步迭代**
   - 先实现最小可行方案
   - 逐步重构和优化

---

> **文档版本**: 1.0.0  
> **最后更新**: 2026-05-29  
> **维护者**: 项目团队

---

## 📝 版本历史

| 版本  | 日期       | 变更内容                   |
| ----- | ---------- | -------------------------- |
| 1.0.0 | 2026-05-29 | 初始版本，基于项目现状整理 |
