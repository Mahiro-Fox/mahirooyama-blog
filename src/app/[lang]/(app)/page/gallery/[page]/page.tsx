import { AboutCta } from '@/app/[lang]/(app)/_components/about-cta';
import PageTitle from '@/app/[lang]/(app)/page/page-title';
import { notFound } from 'next/navigation';
import { getPublicGalleries } from '@/actions/admin/gallery-actions';
import { LinkCard } from '@/components/shared/link-card';
import { Pagination } from '@/components/shared/pagination';
import { i18nConfig } from '@/i18n/i18n.config';
import { formatDate } from '@/utils/utils';

interface GalleryListPageProps {
  params: Promise<{ page: string }>;
}

export const dynamic = 'force-dynamic';

export default async function GalleryListPage({
  params,
}: GalleryListPageProps) {
  const { page } = await params;
  const pageNum = Number.parseInt(page);

  if (isNaN(pageNum)) {
    return notFound();
  }

  const result = await getPublicGalleries({ page: pageNum });

  if (!result.success) {
    return notFound();
  }

  const { items, currentPage, totalPages } = result.data;

  if (currentPage > totalPages) {
    return notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="container-wrapper">
        <div className="container flex flex-col gap-1">
          <section className="container border-b py-6">
            <PageTitle tKey="page.galleries_page_title" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((gallery, index) => {
                // 首屏前 3 张图片优先加载，其余懒加载
                const isPriority = index < 3 && currentPage === 1;

                return (
                  <LinkCard
                    key={gallery.slug}
                    title={gallery.title}
                    imageUrl={gallery.thumbnail}
                    link={`/gallery/${gallery.slug}`}
                    badgeText={formatDate(gallery.lastUpdated)}
                    description={gallery.description}
                    priority={isPriority}
                    isPortrait={gallery.isPortrait}
                  />
                );
              })}
            </div>
          </section>
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath="/page/gallery"
      />
    </div>
  );
}
