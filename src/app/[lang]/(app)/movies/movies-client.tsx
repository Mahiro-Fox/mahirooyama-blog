'use client';

import { Play, Search } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/shadcn-ui/badge';
import { Input } from '@/components/shadcn-ui/input';
import { useT } from '@/i18n/dictionary-provider';
import { Movie } from '@/lib/movies';
import { cn } from '@/utils/utils';

const CACHE_KEY = 'movies_cache';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 分钟缓存

interface MoviesClientProps {
  initialMovies: Movie[];
}

export function MoviesClient({ initialMovies }: MoviesClientProps) {
  const t = useT();
  const [movies] = useState<Movie[]>(() => {
    // 尝试从 sessionStorage 读取缓存
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_EXPIRY) {
            return data;
          }
        } catch {
          // 缓存解析失败，使用 initialMovies
        }
      }
    }
    return initialMovies;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 当 initialMovies 更新时，也更新状态并缓存
  useState(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: initialMovies, timestamp: Date.now() })
      );
    }
  });

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    movies.forEach((movie) => {
      movie.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchesSearch =
        !searchQuery ||
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.summary.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = !selectedTag || movie.tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [movies, searchQuery, selectedTag]);

  return (
    <div className="to-slate-90 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder={t('movies.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-gray-500 focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                !selectedTag
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              )}
            >
              {t('movies.all')}
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  selectedTag === tag
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {filteredMovies.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-gray-500">{t('movies.no_results')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filteredMovies.map((movie) => (
              <a
                key={movie.id}
                href={`/movies/${movie.id}`}
                className="group relative"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src={movie.poster}
                    alt={movie.title}
                    fill
                    unoptimized
                    className="h-full w-full object-cover"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="flex h-16 w-16 scale-0 transform items-center justify-center rounded-full bg-orange-500/90 shadow-lg transition-transform duration-300 group-hover:scale-100">
                      <Play
                        className="ml-1 h-8 w-8 text-white"
                        fill="currentColor"
                      />
                    </div>
                  </div>

                  <div className="absolute right-0 bottom-0 left-0 translate-y-full p-4 transition-transform duration-300 group-hover:translate-y-0">
                    <h3 className="mb-1 truncate text-lg font-bold text-white">
                      {movie.title}
                    </h3>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-white/20 bg-white/10 text-white"
                      >
                        {movie.year}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-white/20 bg-white/10 text-white"
                      >
                        {t('movies.channel_count', {
                          count: movie.sources.length,
                        })}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {movie.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-black/30 px-2 py-0.5 text-xs text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge className="bg-orange-500 text-white">
                      {movie.year}
                    </Badge>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {filteredMovies.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-gray-500">
              {t('movies.total_movies', { count: filteredMovies.length })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
