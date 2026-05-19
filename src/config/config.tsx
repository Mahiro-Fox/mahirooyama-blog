import {
  Camera,
  FileText,
  FolderOpen,
  ImageIcon,
  LucideIcon,
  MessageSquare,
  Music,
  Shield,
  Smile,
  Sticker,
  Tag,
} from 'lucide-react';

export const siteConfig = {
  name: 'mahirooyama-blog',
  description: "this is mahirooyama's blog, welcome to visit!",
  url: 'https://mahirooyama.cn/',
  ogImage: 'https://mahirooyama.cn/images/avatar/mahirooyama.webp',
  links: {
    twitter: 'https://twitter.com/Mahiro___Oyama',
    github: 'https://github.com/Misterwanghaoyu/mahirooyama-blog',
    vrchat:
      'https://vrchat.com/home/user/usr_f938bc37-4d62-48d8-98eb-955f10f464e0',
  },
  copyRight: 'mahirooyama',
  email: 'why510902@163.com',
};

export interface PageRouteConfig {
  name: string;
  navHref: string;
  adminHref: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  hideInNav?: boolean;
}

export const pageRoutesConfig: PageRouteConfig[] = [
  {
    name: 'Blog',
    navHref: '/page/blog/1',
    adminHref: '/admin/blog',
    label: 'Blog 管理',
    title: '管理博客文章和 MDX 文件',
    icon: FileText,
    description:
      '上传、编辑、删除博客文章，支持 Markdown 格式和 JSON Frontmatter。',
  },
  {
    name: 'Gallery',
    navHref: '/page/gallery/1',
    adminHref: '/admin/gallery',
    label: 'Gallery 管理',
    title: '管理图库图片和元数据',
    icon: ImageIcon,
    description: '上传、编辑、删除图库图片，支持元数据管理。',
  },
  {
    name: 'Photos',
    navHref: '/photos',
    adminHref: '',
    label: 'Photos 管理',
    title: '瀑布流图片展示',
    icon: Camera,
    description: '以瀑布流形式展示 public/images/gallery 目录下的图片。',
  },
  {
    name: 'PublicFiles',
    navHref: '/admin/public-files',
    adminHref: '/admin/public-files',
    label: 'Public 文件管理',
    title: '管理 Public 文件夹中的图片',
    icon: FolderOpen,
    description: '上传、删除、重命名 public/images 目录下的图片文件。',
    hideInNav: true,
  },
  {
    name: 'UserManagement',
    navHref: '/admin/users',
    adminHref: '/admin/users',
    label: '用户管理',
    title: '管理系统用户和权限',
    icon: Shield,
    description: '创建、编辑、删除用户账号，管理用户权限（仅超级管理员）.',
    hideInNav: true,
  },
  {
    name: 'Tag',
    navHref: '/tag',
    adminHref: '/admin/tags',
    label: '标签管理',
    icon: Tag,
    title: '管理博客和图库标签',
    description: '创建、编辑、删除标签分类，用于文章和图库的分类管理。',
  },
  {
    name: 'MIDI',
    navHref: '/midi',
    adminHref: '/admin/midi',
    label: 'MIDI 播放',
    title: 'MIDI 播放',
    icon: Music,
    description: 'MIDI 播放',
  },
  {
    name: 'Moments',
    navHref: '/moments',
    adminHref: '/admin/moments',
    label: '碎碎念管理',
    title: '管理碎碎念',
    icon: Smile,
    description: '发布和管理日常碎碎念，支持文字、图片、心情和位置。',
  },
  {
    name: 'Guestbook',
    navHref: '/guestbook',
    adminHref: '/admin/guestbook',
    label: '留言墙管理',
    title: '管理留言墙',
    icon: MessageSquare,
    description: '审核和管理访客留言，支持回复和审核功能。',
  },
];

// 仅导航栏使用的路由（排除 hideInNav 的路由）
export const navRoutesConfig = pageRoutesConfig.filter(
  (route) => !route.hideInNav
);
// 管理员端路由（包含 adminHref）
export const adminRoutesConfig = pageRoutesConfig.filter(
  (route) => route.adminHref
);
