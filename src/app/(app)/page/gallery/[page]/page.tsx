import { notFound } from 'next/navigation';

import { getGalleryImages } from '@/lib/gallery';
import { Gallery } from '@/components/content/gallery';
import { AboutCta } from '@/components/shared/about-cta';
import { Pagination } from '@/components/shared/pagination';

export const dynamic = 'force-static';
export const revalidate = false;
export const dynamicParams = false;

interface GalleryListPageProps {
  params: Promise<{ page: string }>;
}

export async function generateStaticParams() {
  const { totalPages } = await getGalleryImages();

  return await Promise.all(
    Array.from({ length: totalPages }, (_, i) => ({
      page: String(i + 1),
    }))
  );
}

export default async function GalleryListPage({
  params,
}: GalleryListPageProps) {
  const { page } = await params;
  const pageNum = Number.parseInt(page);

  if (isNaN(pageNum)) {
    return notFound();
  }

  const {
    items: paginatedPosts,
    currentPage,
    totalPages,
  } = await getGalleryImages(pageNum);

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
                Paginated Gallery List
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedPosts.map((post) => (
                <Gallery key={post.slug} item={post} />
              ))}
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
