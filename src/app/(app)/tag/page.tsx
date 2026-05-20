import { Metadata } from 'next';
import Link from 'next/link';
import { Tag as TagType } from '@/constant/tag';
import { tagStore } from '@/store/tag-store';
import { FileText, Image, Tag } from 'lucide-react';

import { Card, CardContent } from '@/components/shadcn-ui/card';
import { BrandIcons } from '@/components/shared/brand-icons';

export const metadata: Metadata = {
  title: '标签列表',
  description: '浏览所有博客文章和图库的标签分类',
};

function TagCard({ tag, type }: { tag: TagType; type: 'blog' | 'gallery' }) {
  const IconComponent = BrandIcons[tag.icon as keyof typeof BrandIcons] || Tag;
  const href =
    type === 'blog' ? `/tag/blog/${tag.id}` : `/tag/gallery/${tag.id}`;

  return (
    <Link href={href}>
      <Card className="group cursor-pointer transition-all hover:shadow-md">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg transition-colors">
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">{tag.name}</h3>
            {tag.description && (
              <p className="text-muted-foreground text-xs">{tag.description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function TagsPage() {
  const tags = await tagStore.getAll();

  const blogTagList = Object.values(tags.blog);
  const galleryTagList = Object.values(tags.gallery);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">标签列表</h1>

      {/* 博客标签 */}
      <section className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-xl font-semibold">文章标签</h2>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-sm">
            {blogTagList.length}
          </span>
        </div>
        {blogTagList.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {blogTagList.map((tag) => (
              <TagCard key={tag.id} tag={tag} type="blog" />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">暂无文章标签</p>
        )}
      </section>

      {/* 图库标签 */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Image className="h-5 w-5" />
          <h2 className="text-xl font-semibold">图库标签</h2>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-sm">
            {galleryTagList.length}
          </span>
        </div>
        {galleryTagList.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {galleryTagList.map((tag) => (
              <TagCard key={tag.id} tag={tag} type="gallery" />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">暂无需库标签</p>
        )}
      </section>
    </div>
  );
}
