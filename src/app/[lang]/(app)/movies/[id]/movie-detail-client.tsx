'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useT } from '@/i18n/dictionary-provider';
import { cn } from '@/utils/utils';
import { Calendar, Check, Clock, Tag } from 'lucide-react';

import type { Movie } from '@/lib/movies';
import { Badge } from '@/components/shadcn-ui/badge';
import { VideoPlayer } from '@/components/VideoPlayer';

interface MovieDetailClientProps {
  movie: Movie;
}

export function MovieDetailClient({ movie }: MovieDetailClientProps) {
  const t = useT();
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);

  const changeSource = (index: number) => {
    setCurrentSourceIndex(index);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="pt-20">
        <div className="mx-auto max-w-7xl px-4 pb-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <VideoPlayer
                  movieId={movie.id}
                  sources={movie.sources}
                  currentSourceIndex={currentSourceIndex}
                  changeSource={changeSource}
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <div className="mb-6 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="h-5 w-5" />
                    <span>{movie.year}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Tag className="h-5 w-5" />
                    {movie.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-slate-700 bg-slate-800 text-gray-300"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="h-5 w-5" />
                    <span>
                      {t('movies.channel_count', {
                        count: movie.sources.length,
                      })}
                    </span>
                  </div>
                </div>

                <h2 className="mb-3 text-lg font-bold text-white">
                  {t('movies.plot_summary')}
                </h2>
                <p className="leading-relaxed text-gray-300">{movie.summary}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="sticky top-24">
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
                  <div className="relative aspect-[2/3]">
                    <Image
                      src={movie.poster}
                      alt={movie.title}
                      fill
                      unoptimized
                      className="w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="mb-2 text-xl font-bold text-white">
                      {movie.title}
                    </h3>
                    <p className="mb-4 text-sm text-gray-400">{movie.year}</p>

                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-medium text-gray-400">
                        {t('movies.play_sources')}
                      </h4>
                      <div className="space-y-2">
                        {movie.sources.map((source, index) => (
                          <div
                            key={index}
                            onClick={() => changeSource(index)}
                            className={cn(
                              'flex cursor-pointer items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2',
                              {
                                'bg-slate-900/50': index === currentSourceIndex,
                              }
                            )}
                          >
                            <span className="text-sm text-gray-300">
                              {source.name}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-green-500">
                              {t('movies.available')}
                              {index === currentSourceIndex && (
                                <Check className="h-4 w-4" />
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-medium text-gray-400">
                        {t('movies.tags')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {movie.tags.map((tag) => (
                          <Badge
                            key={tag}
                            className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-700 pt-4">
                      <p className="text-xs text-gray-500">
                        {t('movies.added_on')}{' '}
                        {new Date(movie.lastUpdated).toLocaleDateString(
                          'zh-CN'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
