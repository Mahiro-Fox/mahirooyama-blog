import { notFound } from 'next/navigation';
import { getPublicBlogs } from '@/actions/admin/blog-actions';
import { formatDate } from '@/utils/utils';

import { siteConfig } from '@/config/common';
import { DEFAULT_BLOG_LIST_LIMIT } from '@/config/limit';
import { getBlogs } from '@/lib/blog';
import { paginateItems } from '@/lib/pagination';
import { LinkCard } from '@/components/shared/link-card';
import { Pagination } from '@/components/shared/pagination';
import { AboutCta } from '@/app/[lang]/(app)/_components/about-cta';

interface BlogListPageProps {
  params: Promise<{ page: string }>;
}

export async function generateStaticParams() {
  const all = await getBlogs();
  const { totalPages } = paginateItems(all, 1, DEFAULT_BLOG_LIST_LIMIT);

  return await Promise.all(
    Array.from({ length: totalPages }, (_, i) => ({
      page: String(i + 1),
    }))
  );
}

export default async function BlogListPage({ params }: BlogListPageProps) {
  const { page } = await params;
  const pageNum = Number.parseInt(page);

  if (isNaN(pageNum)) {
    return notFound();
  }

  const result = await getPublicBlogs({ page: pageNum });
  if (!result.success) {
    return notFound();
  }

  const { items: paginatedPosts, currentPage, totalPages } = result.data;

  if (currentPage > totalPages) {
    return notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="container-wrapper">
        <div className="container py-6">
          <AboutCta />
        </div>
      </div>
      <div className="container-wrapper">
        <div className="container flex flex-col gap-1">
          <section className="container border-b py-6">
            <div className="flex flex-col gap-1 pb-6">
              <h2 className="text-2xl font-medium tracking-tight">
                Paginated Blog Post List
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedPosts.map((post) => (
                <LinkCard
                  key={post.slug}
                  title={post.title}
                  imageUrl={post.thumbnail || siteConfig.ogImage}
                  link={`/blog/${post.slug}`}
                  badgeText={formatDate(post.lastUpdated)}
                  description={post.description}
                  priority={true}
                  isPortrait={post.isPortrait}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath="/page/blog"
      />
    </div>
  );
}
