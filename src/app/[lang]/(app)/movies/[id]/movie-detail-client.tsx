'use client';

import { VideoPlayer } from '@/app/[lang]/(app)/movies/[id]/video-player';
import { Calendar, Check, Clock, Tag } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Badge } from '@/components/shadcn-ui/badge';
import { useT } from '@/i18n/dictionary-provider';
import { cn } from '@/utils/utils';

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
    <div className="bg-background min-h-screen">
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

              <div className="bg-card border-border rounded-xl border p-6">
                <div className="mb-6 flex flex-wrap items-center gap-4">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    <span>{movie.year}</span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    {movie.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>
                      {t('movies.channel_count', {
                        count: movie.sources.length,
                      })}
                    </span>
                  </div>
                </div>

                <h2 className="mb-3 text-lg font-bold">
                  {t('movies.plot_summary')}
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {movie.summary}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="sticky top-24">
                <div className="bg-card border-border overflow-hidden rounded-xl border">
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
                    <h3 className="mb-2 text-xl font-bold">{movie.title}</h3>
                    <p className="text-muted-foreground mb-4 text-sm">
                      {movie.year}
                    </p>

                    <div className="mb-4">
                      <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                        {t('movies.play_sources')}
                      </h4>
                      <div className="space-y-2">
                        {movie.sources.map((source, index) => (
                          <button
                            key={source.name}
                            type="button"
                            onClick={() => changeSource(index)}
                            className={cn(
                              'hover:bg-accent flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left transition-colors',
                              index === currentSourceIndex && 'bg-accent'
                            )}
                          >
                            <span className="text-sm">{source.name}</span>
                            <span className="flex items-center gap-1 text-xs text-[var(--primary)]">
                              {t('movies.available')}
                              {index === currentSourceIndex && (
                                <Check className="h-4 w-4" />
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                        {t('movies.tags')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {movie.tags.map((tag) => (
                          <Badge
                            key={tag}
                            className="bg-[var(--primary)]/15 text-[var(--primary)] hover:bg-[var(--primary)]/25"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="border-border border-t pt-4">
                      <p className="text-muted-foreground text-xs">
                        {t('movies.added_on')}{' '}
                        {new Date(movie.created_at).toLocaleDateString('zh-CN')}
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
