import { FileText, FolderOpen, ImageIcon, Shield } from 'lucide-react';

export const siteConfig = {
  name: 'mahirooyama-blog',
  description:
    'mahirooyama-blog is a lightweight, minimalistic blog template built with Next.js (v15), MDX, Tailwind CSS (v4), and shadcn/ui',
  url: 'https://mahirooyama-blog-delta.vercel.app/',
  ogImage: 'https://mahirooyama-blog-delta.vercel.app/og.webp',
  links: {
    twitter: 'https://twitter.com/mahirooyama',
    github: 'https://github.com/Misterwanghaoyu/mahirooyama-blog',
  },
  copyRight: 'mahirooyama',
  email: 'mahirooyama@example.com',
};

export const pageRoutesConfig = [
  {
    name: 'Blog',
    navHref: '/page/blog/1',
    adminHref: '/admin/blog',
    label: 'Blog 管理',
    title: '管理博客文章和 MDX 文件',
    icon: <FileText className="h-4 w-4" />,
    description:
      '上传、编辑、删除博客文章，支持 Markdown 格式和 YAML Frontmatter。',
  },
  {
    name: 'Gallery',
    navHref: '/page/gallery/1',
    adminHref: '/admin/gallery',
    label: 'Gallery 管理',
    title: '管理图库图片和元数据',
    icon: <ImageIcon className="h-4 w-4" />,
    description: '上传、编辑、删除图库图片，支持元数据管理。',
  },
  {
    name: 'PublicFiles',
    navHref: '/admin/public-files',
    adminHref: '/admin/public-files',
    label: 'Public 文件管理',
    title: '管理 Public 文件夹中的图片',
    icon: <FolderOpen className="h-4 w-4" />,
    description: '上传、删除、重命名 public/images 目录下的图片文件。',
    hideInNav: true,
  },
  {
    name: 'UserManagement',
    navHref: '/admin/users',
    adminHref: '/admin/users',
    label: '用户管理',
    title: '管理系统用户和权限',
    icon: <Shield className="h-4 w-4" />,
    description: '创建、编辑、删除用户账号，管理用户权限（仅超级管理员）。',
    hideInNav: true,
  },
  {
    name: 'TagManagement',
    navHref: '/admin/tags',
    adminHref: '/admin/tags',
    label: '标签管理',
    title: '管理博客和图库标签',
    description: '创建、编辑、删除标签分类，用于文章和图库的分类管理。',
    hideInNav: true,
  },
];
