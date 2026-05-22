'use client';

import { useEffect, useState } from 'react';
import { adminGetTags } from '@/actions/admin/tag-actions';
import { TagType, type TagsData } from '@/constant';
import { Tag } from 'lucide-react';

interface TagPickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  type: TagType;
  placeholder?: string;
}

export function TagPicker({ value, onChange, type }: TagPickerProps) {
  const [tags, setTags] = useState<TagsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const result = await adminGetTags();
        if (result.success) {
          setTags(result.tags);
        }
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  const typeTags = tags ? tags[type] : {};

  const handleToggle = (tagId: string) => {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {loading ? (
          <span className="text-muted-foreground text-sm">加载中...</span>
        ) : Object.keys(typeTags).length === 0 ? (
          <span className="text-muted-foreground text-sm">暂无标签</span>
        ) : (
          Object.values(typeTags).map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleToggle(tag.id)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                value.includes(tag.id)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent'
              }`}
            >
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>{tag.name}</span>
              </div>
            </button>
          ))
        )}
      </div>
      {value.length > 0 && (
        <div className="text-muted-foreground text-xs">
          已选择: {value.map((id) => typeTags[id]?.name || id).join(', ')}
        </div>
      )}
    </div>
  );
}
