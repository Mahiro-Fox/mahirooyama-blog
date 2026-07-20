'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Calendar, Clock, PlayCircle, Tag } from 'lucide-react';

import { Badge } from '@/components/shadcn-ui/badge';
import { VideoPlayer } from '@/components/VideoPlayer';

interface MovieSource {
  name: string;
  url: string;
}

interface Movie {
  id: string;
  title: string;
  poster: string;
  year: string;
  tags: string[];
  summary: string;
  created_at: string;
  sources: MovieSource[];
}

export default function MoviePlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchMovie = async () => {
      setIsLoading(true);
      const response = await fetch(`/api/movies`);
      const movies = await response.json();
      const foundMovie = movies.find((m: Movie) => m.id === id);

      if (foundMovie) {
        setMovie(foundMovie);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
      setIsLoading(false);
    };

    fetchMovie();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
          <span className="text-gray-400">正在加载电影信息...</span>
        </div>
      </div>
    );
  }

  if (notFound || !movie) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
        <PlayCircle className="mb-4 h-24 w-24 text-gray-600" />
        <h1 className="mb-2 text-2xl font-bold text-gray-400">电影未找到</h1>
        <p className="mb-6 text-gray-500">该电影不存在或已被删除</p>
        <button
          onClick={() => window.history.back()}
          className="rounded-lg bg-orange-500 px-6 py-2 text-white transition-colors hover:bg-orange-600"
        >
          返回电影列表
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed top-0 right-0 left-0 z-50 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <button
            onClick={() => window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 truncate text-xl font-bold text-white">
            {movie.title}
          </h1>
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-500 text-white">{movie.year}</Badge>
          </div>
        </div>
      </div>

      <div className="pt-20">
        <div className="mx-auto max-w-7xl px-4 pb-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <VideoPlayer movieId={movie.id} sources={movie.sources} />
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
                    <span>{movie.sources.length} 条播放线路</span>
                  </div>
                </div>

                <h2 className="mb-3 text-lg font-bold text-white">剧情简介</h2>
                <p className="leading-relaxed text-gray-300">{movie.summary}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="sticky top-24">
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
                  <Image
                    src={movie.poster}
                    alt={movie.title}
                    fill
                    unoptimized
                    className="w-full object-cover"
                  />
                  <div className="p-4">
                    <h3 className="mb-2 text-xl font-bold text-white">
                      {movie.title}
                    </h3>
                    <p className="mb-4 text-sm text-gray-400">{movie.year}</p>

                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-medium text-gray-400">
                        播放线路
                      </h4>
                      <div className="space-y-2">
                        {movie.sources.map((source, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2"
                          >
                            <span className="text-sm text-gray-300">
                              {source.name}
                            </span>
                            <span className="text-xs text-green-500">可用</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-medium text-gray-400">
                        标签
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
                        添加于{' '}
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
