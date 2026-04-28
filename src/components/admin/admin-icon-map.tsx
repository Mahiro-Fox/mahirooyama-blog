'use client';

import {
  FileText,
  Image,
  Folder,
  Users,
  Tag,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  fileText: FileText,
  image: Image,
  folder: Folder,
  users: Users,
  tag: Tag,
};

export function getAdminIcon(name?: string): LucideIcon {
  return name ? iconMap[name] || FileText : FileText;
}

export { iconMap };
export type AdminIconName = keyof typeof iconMap;
