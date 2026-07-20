import {
  Activity,
  Bug,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  FileText,
  FolderOpen,
  Image,
  ImageIcon,
  Lock,
  LucideIcon,
  MessageSquare,
  Music,
  Shield,
  Smile,
  Tag,
  User,
  Video,
} from 'lucide-react';

// 配置选项常量

// 图片压缩配置
export const COMPRESSION_CONFIG = {
  quality: 80, // WebP 质量 0-100
  maxWidth: 1920, // 最大宽度限制
  maxHeight: 1920, // 最大高度限制
  effort: 4, // 压缩 effort (0-6, 越高越慢但更小)
};

export const siteConfig = {
  name: 'mahirooyama-blog',
  description: "this is mahirooyama's blog, welcome to visit!",
  url: 'https://mahirooyama.cn/',
  ogImage: 'https://mahirooyama.cn/uploads/images/avatar/mahirooyama.webp',
  links: {
    twitter: 'https://twitter.com/Mahiro___Oyama',
    github: 'https://github.com/Misterwanghaoyu/mahirooyama-blog',
    vrchat:
      'https://vrchat.com/home/user/usr_f938bc37-4d62-48d8-98eb-955f10f464e0',
  },
  copyRight: 'mahirooyama',
  email: 'why510902@163.com',
};

type Category = 'Content' | 'Tools' | 'Admin' | 'Other';

export interface PageRouteConfig {
  name: string;
  navHref?: string;
  adminHref?: string;
  label: string;
  title: string;
  navDescription?: string;
  description?: string;
  icon: LucideIcon;
  category?: Category;
  needAuth?: boolean;
}

export const pageRoutesConfig: PageRouteConfig[] = [
  {
    name: '后台',
    needAuth: true,
    navHref: '/admin',
    label: '后台页面',
    title: '去往后台页面',
    icon: ChevronRight,
    navDescription: '去往后台页面',
    description: '去往后台页面',
    category: 'Admin',
  },
  {
    name: '前台',
    adminHref: '/',
    label: '前台页面',
    title: '去往前台页面',
    icon: ChevronLeft,
    description: '去往前台页面',
  },
  {
    name: 'Blog',
    navHref: '/page/blog/1',
    adminHref: '/admin/blog',
    label: 'Blog 管理',
    title: '管理博客文章和 MDX 文件',
    icon: FileText,
    navDescription: '浏览 mahirooyam 的博客文章',
    description: '上传、编辑、删除博客文章，支持 mdx、md 格式',
    category: 'Content',
  },
  {
    name: 'Gallery',
    navHref: '/page/gallery/1',
    adminHref: '/admin/gallery',
    label: 'Gallery 管理',
    title: '管理图库图片和元数据',
    icon: ImageIcon,
    navDescription: '浏览 mahirooyam 的图库作品',
    description: '上传、编辑、删除图库图片，支持元数据管理。',
    category: 'Content',
  },
  {
    name: 'Photos',
    navHref: '/photos',
    label: 'Photos 管理',
    title: '瀑布流图片展示',
    icon: Camera,
    navDescription: '浏览 mahirooyam 的照片集',
    description: '以瀑布流形式展示 uploads/images/gallery 目录下的图片。',
    category: 'Content',
  },
  {
    name: 'Moments',
    navHref: '/moments',
    adminHref: '/admin/moments',
    label: '碎碎念管理',
    title: '管理碎碎念',
    icon: Smile,
    navDescription: '查看 mahirooyam 的日常碎碎念',
    description: '发布和管理日常碎碎念，支持文字、图片、心情和位置。',
    category: 'Content',
  },
  {
    name: 'Movies',
    navHref: '/movies',
    adminHref: '/admin/movies',
    label: '影视管理',
    title: '管理私人影视收藏',
    icon: Clapperboard,
    navDescription: '浏览私人影视收藏',
    description:
      '添加、编辑、删除私人影视收藏，支持海报、标签、简介和播放链接。',
    category: 'Content',
  },
  {
    name: 'Guestbook',
    navHref: '/guestbook',
    adminHref: '/admin/guestbook',
    label: '留言墙管理',
    title: '管理留言墙',
    icon: MessageSquare,
    navDescription: '查看与留言 mahirooyam 的留言墙',
    description: '审核和管理访客留言，支持回复和审核功能。',
    category: 'Content',
  },
  {
    name: 'UploadFiles',
    adminHref: '/admin/upload-files',
    label: 'Upload 文件管理',
    title: '管理 Upload 文件夹中的文件',
    icon: FolderOpen,
    description: '上传、删除、重命名 uploads 目录下的文件。',
  },
  {
    name: 'UserManagement',
    adminHref: '/admin/users',
    label: '用户管理',
    title: '管理系统用户和权限',
    icon: Shield,
    description: '创建、编辑、删除用户账号，管理用户权限（仅超级管理员）.',
  },
  {
    name: 'MIDI',
    navHref: '/midi',
    adminHref: '/admin/midi',
    label: 'MIDI 播放',
    title: 'MIDI 播放',
    icon: Music,
    navDescription: 'VRChat 中文吧自动钢琴工具',
    description: 'MIDI 播放',
    category: 'Tools',
  },
  {
    name: 'BilibiliParse',
    navHref: '/bilibili-parse',
    label: 'Bilibili 视频解析',
    title: 'Bilibili 视频解析',
    icon: Video,
    navDescription: 'Bilibili 视频解析工具',
    description: 'Bilibili 视频解析工具',
    category: 'Tools',
  },
  {
    name: 'Image Compressor',
    navHref: '/image-compressor',
    label: '图片转换压缩工具',
    title: '图片转换压缩工具',
    icon: Image,
    navDescription: '图片压缩与格式转换工具',
    category: 'Tools',
  },
  {
    name: 'About',
    navHref: '/about',
    label: '关于我',
    title: '关于我',
    icon: User,
    navDescription: '关于我的个人介绍',
    category: 'Other',
  },
  {
    name: 'Secret',
    needAuth: true,
    navHref: '/secret',
    label: 'Secret',
    title: 'Secret',
    icon: Lock,
    navDescription: 'Secret',
    category: 'Other',
  },
  {
    name: 'Tag',
    navHref: '/tag',
    adminHref: '/admin/tags',
    label: '标签管理',
    icon: Tag,
    title: '管理博客和图库标签',
    navDescription: '查看全站内容标签分类',
    description: '创建、编辑、删除标签分类，用于文章和图库的分类管理。',
    category: 'Other',
  },
  {
    name: 'Analytics',
    adminHref: '/admin/analytics',
    label: '访问日志',
    title: '查看网站访问日志',
    icon: Activity,
    description: '查看网站访问日志，包括访问时间、页面、设备等信息。',
  },
  {
    name: 'BugReport',
    adminHref: '/admin/bugs',
    label: 'BUG 报告',
    title: '查看用户提交的 BUG',
    icon: Bug,
    description: '查看和处理用户反馈的网站 BUG。',
  },
];

// 仅导航栏使用的路由（包含 navHref）
export const navRoutesConfig = pageRoutesConfig.filter(
  (route) => route.navHref
);
// 根据分类分组导航路由
export const groupedNavRoutes = navRoutesConfig.reduce<
  Record<string, typeof navRoutesConfig>
>((acc, route) => {
  const category = route.category || 'Other';
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(route);
  return acc;
}, {});
// 管理员端路由（包含 adminHref）
export const adminRoutesConfig = pageRoutesConfig.filter(
  (route) => route.adminHref
);
