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
  name: 'Mahirooyama Blog',
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

type Category = 'content' | 'tools' | 'admin' | 'other';

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
    name: 'admin',
    needAuth: true,
    navHref: '/admin',
    label: 'admin_label',
    title: 'admin_title',
    icon: ChevronRight,
    navDescription: 'admin_nav_description',
    description: 'admin_description',
    category: 'admin',
  },
  {
    name: 'frontpage',
    adminHref: '/',
    label: 'frontpage_label',
    title: 'frontpage_title',
    icon: ChevronLeft,
    description: 'frontpage_description',
  },
  {
    name: 'blog',
    navHref: '/page/blog/1',
    adminHref: '/admin/blog',
    label: 'blog_label',
    title: 'blog_title',
    icon: FileText,
    navDescription: 'blog_nav_description',
    description: 'blog_description',
    category: 'content',
  },
  {
    name: 'gallery',
    navHref: '/page/gallery/1',
    adminHref: '/admin/gallery',
    label: 'gallery_label',
    title: 'gallery_title',
    icon: ImageIcon,
    navDescription: 'gallery_nav_description',
    description: 'gallery_description',
    category: 'content',
  },
  {
    name: 'Photos',
    navHref: '/photos',
    label: 'photos_label',
    title: 'photos_title',
    icon: Camera,
    navDescription: 'photos_nav_description',
    description: 'photos_description',
    category: 'content',
  },
  {
    name: 'moments',
    navHref: '/moments',
    adminHref: '/admin/moments',
    label: 'moments_label',
    title: 'moments_title',
    icon: Smile,
    navDescription: 'moments_nav_description',
    description: 'moments_description',
    category: 'content',
  },
  {
    name: 'movies',
    navHref: '/movies',
    adminHref: '/admin/movies',
    label: 'movies_label',
    title: 'movies_title',
    icon: Clapperboard,
    navDescription: 'movies_nav_description',
    description: 'movies_description',
    category: 'content',
  },
  {
    name: 'music',
    adminHref: '/admin/music',
    label: 'music_label',
    title: 'music_title',
    icon: Music,
    navDescription: 'music_nav_description',
    description: 'music_description',
    category: 'content',
  },
  {
    name: 'guestbook',
    navHref: '/guestbook',
    adminHref: '/admin/guestbook',
    label: 'guestbook_label',
    title: 'guestbook_title',
    icon: MessageSquare,
    navDescription: 'guestbook_nav_description',
    description: 'guestbook_description',
    category: 'content',
  },
  {
    name: 'upload_files',
    adminHref: '/admin/upload-files',
    label: 'upload_files_label',
    title: 'upload_files_title',
    icon: FolderOpen,
    description: 'upload_files_description',
  },
  {
    name: 'user_management',
    adminHref: '/admin/users',
    label: 'user_management_label',
    title: 'user_management_title',
    icon: Shield,
    description: 'user_management_description',
  },
  {
    name: 'midi',
    navHref: '/midi',
    adminHref: '/admin/midi',
    label: 'midi_label',
    title: 'midi_title',
    icon: Music,
    navDescription: 'midi_nav_description',
    description: 'midi_description',
    category: 'tools',
  },
  {
    name: 'bilibili_parse',
    navHref: '/bilibili-parse',
    label: 'bilibili_parse_label',
    title: 'bilibili_parse_title',
    icon: Video,
    navDescription: 'bilibili_parse_nav_description',
    description: 'bilibili_parse_description',
    category: 'tools',
  },
  {
    name: 'image_compressor',
    navHref: '/image-compressor',
    label: 'image_compressor_label',
    title: 'image_compressor_title',
    icon: Image,
    navDescription: 'image_compressor_nav_description',
    category: 'tools',
  },
  {
    name: 'about',
    navHref: '/about',
    label: 'about_label',
    title: 'about_title',
    icon: User,
    navDescription: 'about_nav_description',
    category: 'other',
  },
  {
    name: 'secret',
    needAuth: true,
    navHref: '/secret',
    label: 'secret_label',
    title: 'secret_title',
    icon: Lock,
    navDescription: 'secret_nav_description',
    category: 'other',
  },
  {
    name: 'tags',
    navHref: '/tag',
    adminHref: '/admin/tags',
    label: 'tags_label',
    icon: Tag,
    title: 'tags_title',
    navDescription: 'tags_nav_description',
    description: 'tags_description',
    category: 'other',
  },
  {
    name: 'analytics',
    adminHref: '/admin/analytics',
    label: 'analytics_label',
    title: 'analytics_title',
    icon: Activity,
    description: 'analytics_description',
  },
  {
    name: 'bug_report',
    adminHref: '/admin/bugs',
    label: 'bug_report_label',
    title: 'bug_report_title',
    icon: Bug,
    description: 'bug_report_description',
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
