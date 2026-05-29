import {
  Camera,
  ChartBar,
  Cloud,
  Code,
  Cpu,
  Database,
  Gamepad2,
  Globe,
  LucideIcon,
  MapPin,
  Music,
  Palette,
  Pen,
  Smartphone,
  Terminal,
  Utensils,
  Video,
} from 'lucide-react';

// 卡片内容类型定义
export interface ProfileContent {
  greeting: string;
  name: string;
  title: string;
  avatar?: string;
}

export interface PursuitContent {
  text: string;
  emphasis?: string;
}

export interface SkillsContent {
  skills: Array<{
    name: string;
    icon: LucideIcon;
    level?: number;
  }>;
}

export interface MapContent {
  location: string;
  country: string;
  city: string;
  mapImage?: string;
}

export interface BadgeContent {
  type: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
  image?: string;
}

export interface MediaContent {
  category: string;
  title: string;
  image: string;
  description?: string;
}

export interface MarqueeContent {
  text: string;
  repeat?: number;
}

export interface TextContent {
  text: string;
  emphasis?: string;
}

// 联合类型
export type CardContent =
  | ProfileContent
  | PursuitContent
  | SkillsContent
  | MapContent
  | BadgeContent
  | MediaContent
  | MarqueeContent
  | TextContent;

// 卡片类型
export type CardType =
  | 'profile'
  | 'pursuit'
  | 'skills'
  | 'map'
  | 'badge'
  | 'media'
  | 'marquee'
  | 'text';

// Bento 卡片接口
export interface BentoCard {
  id: string;
  type: CardType;
  size: string; // Tailwind Grid 类名，例如："md:col-span-2 md:row-span-2"
  title?: string;
  subtitle?: string;
  content: CardContent;
}

// 关于页面配置
export interface AboutConfig {
  name: string;
  avatar: string;
  bio: string;
  cards: BentoCard[];
}

// 导出配置
export const aboutConfig: AboutConfig = {
  name: 'Mahirooyama',
  avatar: '/uploads/images/avatar/mahirooyama.webp',
  bio: '世界虽顺应，我塞于手心。',
  cards: [
    {
      id: 'profile',
      type: 'profile',
      size: 'md:col-span-3',
      content: {
        greeting: '👋 你好呀！',
        name: 'MahiroOyama',
        title: '全栈开发，社畜',
      },
    },
    {
      id: 'pursuit',
      type: 'pursuit',
      size: 'md:col-span-1',
      content: {
        text: '追求',
        emphasis: '想去看看世界，想去看极光',
      },
    },
    {
      id: 'marquee',
      type: 'marquee',
      size: 'md:col-span-4',
      content: {
        text: '欢迎来到我的网站！愿你拥有美好的一天！ - Welcome to visit my website! wish you have a good day! ',
        repeat: 3,
      },
    },
    {
      id: 'skills',
      type: 'skills',
      size: 'md:col-span-2 md:row-span-2',
      title: '开启创造力',
      content: {
        skills: [
          { name: '前端开发', icon: Code, level: 95 },
          { name: 'UI 设计', icon: Palette, level: 90 },
          { name: '移动端', icon: Smartphone, level: 85 },
          { name: 'Web 技术', icon: Globe, level: 90 },
          { name: '数据库', icon: Database, level: 80 },
          { name: '云计算', icon: Cloud, level: 75 },
          { name: '命令行', icon: Terminal, level: 85 },
          { name: '硬件', icon: Cpu, level: 70 },
          { name: '游戏', icon: Gamepad2, level: 80 },
          { name: '音乐', icon: Music, level: 65 },
          { name: '视频', icon: Video, level: 70 },
          { name: '摄影', icon: Camera, level: 75 },
          { name: '写作', icon: Pen, level: 60 },
          { name: '烹饪', icon: Utensils, level: 55 },
          { name: '旅行', icon: MapPin, level: 60 },
        ],
      },
    },
    {
      id: 'badge',
      type: 'badge',
      size: 'md:col-span-2',
      title: 'MBTI',
      content: {
        type: 'INFP',
        label: '调停者',
        description: '富有想象力、理想主义的调停者',
      },
    },
    {
      id: 'map',
      type: 'map',
      size: 'md:col-span-2',
      content: {
        location: '中国',
        country: '中国',
        city: '成都市',
      },
    },
    {
      id: 'media-minecraft',
      type: 'media',
      size: 'md:col-span-2 md:row-span-2',
      content: {
        category: '游戏',
        title: 'Minecraft',
        image: '/uploads/images/about/minecraft.webp',
        description: '像素世界的无限可能',
      },
    },
    {
      id: 'media-vrchat',
      type: 'media',
      size: 'md:col-span-2 md:row-span-2',
      content: {
        category: '游戏',
        title: 'VRChat',
        image: '/uploads/images/about/vrchat.webp',
        description: '我的第二人生',
      },
    },
    {
      id: 'media-tech',
      type: 'media',
      size: 'md:col-span-2 md:row-span-2',
      content: {
        category: '数码科技',
        title: '数码探索',
        image: '/uploads/images/about/tech.webp',
        description: '无人机、VR、AR眼镜...',
      },
    },
    {
      id: 'media-dream',
      type: 'media',
      size: 'md:col-span-2 md:row-span-2',
      content: {
        category: '梦核',
        title: '梦境空间',
        image: '/uploads/images/about/dream.webp',
        description: '超现实的梦幻世界',
      },
    },
  ],
};
