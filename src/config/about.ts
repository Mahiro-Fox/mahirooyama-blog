import {
  Camera,
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
import { author } from '@/lib/author';

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
  name: author.name,
  avatar: author.image,
  bio: 'about.bio',
  cards: [
    {
      id: 'profile',
      type: 'profile',
      size: 'md:col-span-3',
      content: {
        greeting: 'about.profile.greeting',
        name: 'MahiroOyama',
        title: 'about.profile.title',
      },
    },
    {
      id: 'pursuit',
      type: 'pursuit',
      size: 'md:col-span-1',
      content: {
        text: 'about.pursuit.text',
        emphasis: 'about.pursuit.emphasis',
      },
    },
    {
      id: 'marquee',
      type: 'marquee',
      size: 'md:col-span-4',
      content: {
        text: 'about.marquee.text',
        repeat: 3,
      },
    },
    {
      id: 'skills',
      type: 'skills',
      size: 'row-span-2  md:col-span-2 md:row-span-2',
      title: 'about.skills.title',
      content: {
        skills: [
          { name: 'about.skills.frontend_development', icon: Code, level: 95 },
          { name: 'about.skills.ui_designer', icon: Palette, level: 90 },
          {
            name: 'about.skills.mobile_application',
            icon: Smartphone,
            level: 85,
          },
          { name: 'about.skills.web_technology', icon: Globe, level: 90 },
          { name: 'about.skills.database', icon: Database, level: 80 },
          { name: 'about.skills.cloud_computing', icon: Cloud, level: 75 },
          { name: 'about.skills.command_line', icon: Terminal, level: 85 },
          { name: 'about.skills.hardware', icon: Cpu, level: 70 },
          { name: 'about.skills.game', icon: Gamepad2, level: 80 },
          { name: 'about.skills.music', icon: Music, level: 65 },
          { name: 'about.skills.video', icon: Video, level: 70 },
          { name: 'about.skills.photo', icon: Camera, level: 75 },
          { name: 'about.skills.write', icon: Pen, level: 60 },
          { name: 'about.skills.cooking', icon: Utensils, level: 55 },
          { name: 'about.skills.travel', icon: MapPin, level: 60 },
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
        label: 'about.badge.label',
        description: 'about.badge.description',
      },
    },
    {
      id: 'map',
      type: 'map',
      size: 'md:col-span-2',
      content: {
        location: 'about.map.location',
        country: 'about.map.country',
        city: 'about.map.city',
      },
    },
    {
      id: 'media-minecraft',
      type: 'media',
      size: 'md:col-span-2 md:row-span-2',
      content: {
        category: 'about.media.category_game',
        title: 'Minecraft',
        image: '/uploads/images/about/minecraft.webp',
        description: 'about.media.category_game_minecraft_description',
      },
    },
    {
      id: 'media-vrchat',
      type: 'media',
      size: 'md:col-span-2 md:row-span-2',
      content: {
        category: 'about.media.category_game',
        title: 'VRChat',
        image: '/uploads/images/about/vrchat.webp',
        description: 'about.media.category_game_vrchat_description',
      },
    },
    {
      id: 'media-tech',
      type: 'media',
      size: 'md:col-span-2 md:row-span-2',
      content: {
        category: 'about.media.category_tech',
        title: 'about.media.category_tech_title',
        image: '/uploads/images/about/tech.webp',
        description: 'about.media.category_tech_description',
      },
    },
    {
      id: 'media-dream',
      type: 'media',
      size: 'md:col-span-2 md:row-span-2',
      content: {
        category: 'about.media.category_dream',
        title: 'about.media.category_dream_title',
        image: '/uploads/images/about/dream.webp',
        description: 'about.media.category_dream_description',
      },
    },
  ],
};
