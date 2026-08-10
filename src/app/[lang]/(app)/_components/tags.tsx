'use client';

import { TagsData } from '@/constant';
import { TagIcon } from 'lucide-react';
import { BrandIcons } from '@/components/shared/brand-icons';
import { Link } from '@/components/shared/link';
import { useT } from '@/i18n/dictionary-provider';

export default function Tags({ tags }: { tags: TagsData }) {
  const t = useT();
  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-3 text-2xl font-medium tracking-tight">
          <span className="block h-5 w-1 rounded-full bg-[var(--primary)]" />
          {t('home.tags')}
        </h2>
      </div>
      {Object.entries(tags).map(([key, value]) => (
        <div key={key} className="flex flex-wrap gap-2">
          {Object.values(value).map((tag) => {
            const IconComponent =
              BrandIcons[tag.icon as keyof typeof BrandIcons] || TagIcon;
            return (
              <Link
                key={tag.id}
                href={`/tag/${key}/${tag.id}`}
                className="hover:bg-accent flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2 transition-colors hover:border-[var(--primary)]/40"
              >
                <IconComponent className="size-4" />
                {tag.name}
              </Link>
            );
          })}
        </div>
      ))}
    </section>
  );
}
