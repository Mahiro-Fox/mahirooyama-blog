'use client';

import { Tag } from 'lucide-react';
import { BrandIcons } from './brand-icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn-ui/select';

const AVAILABLE_ICONS = [
  { value: 'default', label: 'Default' },
  { value: 'mdx', label: 'MDX' },
  { value: 'gitHub', label: 'GitHub' },
  { value: 'linux', label: 'Linux' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'tailwind', label: 'Tailwind' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'vrchat', label: 'VRChat' },
  { value: 'bilibili', label: 'Bilibili' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'js', label: 'JavaScript' },
  { value: 'react', label: 'React' },
  { value: 'vercel', label: 'Vercel' },
];

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function IconPicker({ value, onChange, placeholder = '选择图标' }: IconPickerProps) {
  const SelectedIcon = value
    ? BrandIcons[value as keyof typeof BrandIcons] || Tag
    : Tag;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <div className="flex items-center gap-2">
          <SelectedIcon className="h-4 w-4" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_ICONS.map((icon) => {
          const IconComponent = BrandIcons[icon.value as keyof typeof BrandIcons] || Tag;
          return (
            <SelectItem key={icon.value} value={icon.value}>
              <div className="flex items-center gap-2">
                <IconComponent className="h-4 w-4" />
                <span>{icon.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export { AVAILABLE_ICONS };
