'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/i18n/dictionary-provider';
import { trackEvent } from '@/utils/tracker';
import {
  FileText,
  Image,
  Loader2,
  Search as SearchIcon,
  X,
} from 'lucide-react';

import { SearchResult, useSearch } from '@/hooks/use-search';
import { Button } from '@/components/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn-ui/dialog';
import { Input } from '@/components/shadcn-ui/input';
import { Link } from '@/components/shared/link';

export function Search() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { keyword, setKeyword, results, isLoading, clearSearch } =
    useSearch(10);

  // 键盘快捷键 Cmd/Ctrl + K 打开搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClose = () => {
    setOpen(false);
    clearSearch();
  };

  return (
    <>
      {/* 搜索触发按钮 */}
      <Button
        variant="outline"
        className="bg-muted/50 hover:bg-muted relative hidden h-9 w-full cursor-pointer justify-start rounded-md text-sm font-normal shadow-none sm:pr-12 md:block md:w-40 lg:w-64"
        onClick={() => {
          setOpen(true);
          trackEvent('open_search_dialog');
        }}
      >
        <SearchIcon className="mr-2 h-4 w-4" />
        <kbd className="bg-muted pointer-events-none absolute top-1.5 right-1.5 hidden h-6 items-center gap-1 rounded border px-1.5 font-mono text-xs font-medium opacity-100 select-none sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <SearchIcon
        onClick={() => {
          setOpen(true);
          trackEvent('open_search_dialog');
        }}
        className="mr-2 h-4 w-4 md:hidden"
      />

      {/* 搜索弹窗 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl gap-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('search_title')}</DialogTitle>
          </DialogHeader>

          {/* 搜索输入框 */}
          <div className="flex items-center border-b px-3">
            <SearchIcon className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              className="placeholder:text-muted-foreground flex h-14 w-full rounded-md border-0 bg-transparent py-4 text-sm outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={t('search_placeholder')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              autoFocus
            />
            {keyword && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 搜索结果 */}
          <div className="max-h-[400px] overflow-y-auto py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : results.length > 0 ? (
              <div className="px-2">
                <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                  {t('search_results', { count: results.length })}
                </div>
                {results.map((result) => (
                  <SearchResultItem
                    key={result.slug}
                    result={result}
                    onClick={handleClose}
                  />
                ))}
              </div>
            ) : keyword ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                {t('search_no_results')}
              </div>
            ) : (
              <div className="text-muted-foreground py-8 text-center text-sm">
                {t('search_no_results_placeholder')}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchResultItem({
  result,
  onClick,
}: {
  result: SearchResult;
  onClick: () => void;
}) {
  const Icon = result.type === 'blog' ? FileText : Image;

  return (
    <Link
      href={result.slug}
      onClick={onClick}
      className="hover:bg-accent hover:text-accent-foreground flex items-start gap-3 rounded-sm px-2 py-2.5 text-sm"
    >
      <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex flex-col gap-1 overflow-hidden">
        <span className="truncate font-medium">{result.title}</span>
        <span className="text-muted-foreground line-clamp-1 text-xs">
          {result.description}
        </span>
        {result.tags && result.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {result.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
