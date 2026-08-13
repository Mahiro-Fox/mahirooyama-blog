import PageTitle from '@/app/[lang]/(app)/page/page-title';
import { notFound } from 'next/navigation';
import { getPublicBlogs } from '@/actions/admin/blog-actions';
import { LinkCard } from '@/components/shared/link-card';
import { Pagination } from '@/components/shared/pagination';
import { siteConfig } from '@/config/common';
import { formatDate } from '@/utils/utils';

interface BlogListPageProps {
  params: Promise<{ page: string }>;
}

export const dynamic = 'force-dynamic';

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
        <div className="container flex flex-col gap-1">
          <section className="container border-b py-6">
            <PageTitle tKey="page.posts_page_title" />
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
