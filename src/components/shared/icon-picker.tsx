'use client';

import { AVAILABLE_ICONS } from '@/config';
import { Tag } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn-ui/select';
import { BrandIcons } from './brand-icons';

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function IconPicker({
  value,
  onChange,
  placeholder = '选择图标',
}: IconPickerProps) {
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
          const IconComponent =
            BrandIcons[icon.value as keyof typeof BrandIcons] || Tag;
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
