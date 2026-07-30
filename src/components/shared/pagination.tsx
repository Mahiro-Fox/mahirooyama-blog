import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import {
  Pagination as PaginationCN,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/shadcn-ui/pagination';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  maxLinks?: number;
  showFirstLast?: boolean;
  className?: string;
}

interface PaginationItemType {
  pageNumber: number;
  disabled?: boolean;
}

const generatePageItems = (
  totalPages: number,
  currentPage: number,
  maxLinks: number
): PaginationItemType[] => {
  const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);

  if (totalPages <= maxLinks) {
    return allPages.map((pageNumber) => ({
      pageNumber,
      disabled: pageNumber === currentPage,
    }));
  }

  const halfLinks = Math.floor(maxLinks / 2);
  const endPage = Math.min(totalPages, currentPage + halfLinks);
  const startPage = Math.max(1, endPage - maxLinks + 1);

  const pageRange = allPages.slice(startPage - 1, startPage - 1 + maxLinks);

  return pageRange.map((pageNumber) => ({
    pageNumber,
    disabled: pageNumber === currentPage,
  }));
};

const generatePrevItem = (
  currentPage: number
): PaginationItemType | undefined =>
  currentPage > 1 ? { pageNumber: currentPage - 1 } : undefined;

const generateNextItem = (
  totalPages: number,
  currentPage: number
): PaginationItemType | undefined =>
  currentPage < totalPages ? { pageNumber: currentPage + 1 } : undefined;

const generateFirstItem = (
  currentPage: number,
  maxLinks: number
): PaginationItemType | undefined =>
  currentPage > Math.ceil(maxLinks / 2) ? { pageNumber: 1 } : undefined;

const generateLastItem = (
  totalPages: number,
  currentPage: number,
  maxLinks: number
): PaginationItemType | undefined =>
  currentPage < totalPages - Math.floor(maxLinks / 2)
    ? { pageNumber: totalPages }
    : undefined;

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  maxLinks = 5,
  showFirstLast = false,
  className,
}: PaginationProps) {
  const paginationItems = {
    first: showFirstLast ? generateFirstItem(currentPage, maxLinks) : undefined,
    prev: generatePrevItem(currentPage),
    targetPages: generatePageItems(totalPages, currentPage, maxLinks),
    next: generateNextItem(totalPages, currentPage),
    last: showFirstLast
      ? generateLastItem(totalPages, currentPage, maxLinks)
      : undefined,
  };

  return (
    <PaginationCN className={className || 'my-10'}>
      <PaginationContent className="gap-3">
        {paginationItems.first && (
          <PaginationItem>
            <PaginationLink href={`${basePath}/1`}>1</PaginationLink>
          </PaginationItem>
        )}
        {paginationItems.first && <span className="px-2">...</span>}
        {paginationItems.prev && (
          <PaginationItem>
            <PaginationLink
              href={`${basePath}/${paginationItems.prev.pageNumber}`}
            >
              <ChevronLeftIcon className="size-4" />
              <span className="sr-only">上一页</span>
            </PaginationLink>
          </PaginationItem>
        )}
        {paginationItems.targetPages.map((targetPage, index) => {
          const isCurrent = targetPage.disabled;
          return (
            <PaginationItem key={index}>
              <PaginationLink
                isActive={isCurrent}
                href={isCurrent ? '#' : `${basePath}/${targetPage.pageNumber}`}
              >
                {targetPage.pageNumber}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        {paginationItems.next && (
          <PaginationItem>
            <PaginationLink
              href={`${basePath}/${paginationItems.next.pageNumber}`}
            >
              <ChevronRightIcon className="size-4" />
              <span className="sr-only">下一页</span>
            </PaginationLink>
          </PaginationItem>
        )}
        {paginationItems.last && <span className="px-2">...</span>}
        {paginationItems.last && (
          <PaginationItem>
            <PaginationLink href={`${basePath}/${totalPages}`}>
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        )}
      </PaginationContent>
    </PaginationCN>
  );
}
