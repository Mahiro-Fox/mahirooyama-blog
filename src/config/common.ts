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
  MessageCircleMore,
  MessageSquare,
  Music,
  Shield,
  Smile,
  Tag,
  User,
  Video,
} from 'lucide-react';

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
  icon: LucideIcon;
  category?: Category;
  navHref?: string;
  navLabel?: string;
  navDescription?: string;
  adminHref?: string;
  adminTitle?: string;
  adminDescription?: string;
  needAuth?: boolean;
}

export const pageRoutesConfig: PageRouteConfig[] = [
  {
    name: 'admin',
    icon: ChevronRight,
    category: 'admin',
    navHref: '/admin',
    navLabel: 'admin_nav_label',
    navDescription: 'admin_nav_description',
    needAuth: true,
  },
  {
    name: 'frontpage',
    icon: ChevronLeft,
    adminHref: '/',
    adminTitle: 'frontpage_admin_title',
    adminDescription: 'frontpage_admin_description',
  },
  {
    name: 'blog',
    icon: FileText,
    category: 'content',
    navHref: '/page/blog/1',
    navLabel: 'blog_nav_label',
    navDescription: 'blog_nav_description',
    adminHref: '/admin/blog',
    adminTitle: 'blog_admin_title',
    adminDescription: 'blog_admin_description',
  },
  {
    name: 'gallery',
    icon: ImageIcon,
    category: 'content',
    navHref: '/page/gallery/1',
    navLabel: 'gallery_nav_label',
    navDescription: 'gallery_nav_description',
    adminHref: '/admin/gallery',
    adminTitle: 'gallery_admin_title',
    adminDescription: 'gallery_admin_description',
  },
  {
    name: 'Photos',
    icon: Camera,
    category: 'content',
    navHref: '/photos',
    navLabel: 'photos_nav_label',
    navDescription: 'photos_nav_description',
  },
  {
    name: 'moments',
    icon: Smile,
    category: 'content',
    navHref: '/moments',
    navLabel: 'moments_nav_label',
    navDescription: 'moments_nav_description',
    adminHref: '/admin/moments',
    adminTitle: 'moments_admin_title',
    adminDescription: 'moments_admin_description',
  },
  {
    name: 'movies',
    icon: Clapperboard,
    category: 'content',
    navHref: '/movies',
    navLabel: 'movies_nav_label',
    navDescription: 'movies_nav_description',
    adminHref: '/admin/movies',
    adminTitle: 'movies_admin_title',
    adminDescription: 'movies_admin_description',
  },
  {
    name: 'music',
    icon: Music,
    adminHref: '/admin/music',
    adminTitle: 'music_admin_title',
    adminDescription: 'music_admin_description',
  },
  {
    name: 'guestbook',
    icon: MessageSquare,
    category: 'content',
    navHref: '/guestbook',
    navLabel: 'guestbook_nav_label',
    navDescription: 'guestbook_nav_description',
    adminHref: '/admin/guestbook',
    adminTitle: 'guestbook_admin_title',
    adminDescription: 'guestbook_admin_description',
  },
  {
    name: 'upload_files',
    icon: FolderOpen,
    adminHref: '/admin/upload-files',
    adminTitle: 'upload_files_admin_title',
    adminDescription: 'upload_files_admin_description',
  },
  {
    name: 'user_management',
    icon: Shield,
    adminHref: '/admin/users',
    adminTitle: 'user_management_admin_title',
    adminDescription: 'user_management_admin_description',
  },
  {
    name: 'midi',
    icon: Music,
    category: 'tools',
    navHref: '/midi',
    navLabel: 'midi_nav_label',
    navDescription: 'midi_nav_description',
    adminHref: '/admin/midi',
    adminTitle: 'midi_admin_title',
    adminDescription: 'midi_admin_description',
  },
  {
    name: 'bilibili_parse',
    icon: Video,
    category: 'tools',
    navHref: '/bilibili-parse',
    navLabel: 'bilibili_parse_nav_label',
    navDescription: 'bilibili_parse_nav_description',
  },
  {
    name: 'image_compressor',
    icon: Image,
    category: 'tools',
    navHref: '/image-compressor',
    navLabel: 'image_compressor_nav_label',
    navDescription: 'image_compressor_nav_description',
  },
  {
    name: 'ai_chat',
    icon: MessageCircleMore,
    category: 'tools',
    navHref: '/chat',
    navLabel: 'ai_chat_nav_label',
    navDescription: 'ai_chat_nav_description',
  },
  {
    name: 'about',
    icon: User,
    category: 'other',
    navHref: '/about',
    navLabel: 'about_nav_label',
    navDescription: 'about_nav_description',
  },
  {
    name: 'secret',
    icon: Lock,
    category: 'other',
    needAuth: true,
    navHref: '/secret',
    navLabel: 'secret_nav_label',
    navDescription: 'secret_nav_description',
  },
  {
    name: 'tags',
    icon: Tag,
    category: 'other',
    navHref: '/tag',
    navLabel: 'tags_nav_label',
    navDescription: 'tags_nav_description',
    adminHref: '/admin/tags',
    adminTitle: 'tags_admin_title',
    adminDescription: 'tags_admin_description',
  },
  {
    name: 'analytics',
    icon: Activity,
    adminHref: '/admin/analytics',
    adminTitle: 'analytics_admin_title',
    adminDescription: 'analytics_admin_description',
  },
  {
    name: 'bug_report',
    icon: Bug,
    adminHref: '/admin/bugs',
    adminTitle: 'bug_report_admin_title',
    adminDescription: 'bug_report_admin_description',
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
