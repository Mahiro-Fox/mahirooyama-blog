import { notFound } from 'next/navigation';
import { getMovies, type Movie } from '@/actions/admin/movie-actions';

import { MovieDetailClient } from './movie-detail-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getMovies();
  const movies = result.success ? result.data : [];
  const movie = movies.find((m: Movie) => m.id === id);

  return {
    title: movie ? `${movie.title} - 私人影视收藏` : '电影未找到',
    description: movie?.summary || '私人影视收藏',
  };
}

export default async function MoviePlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getMovies();
  const movies = result.success ? result.data : [];
  const movie = movies.find((m: Movie) => m.id === id);

  if (!movie) {
    notFound();
  }

  return <MovieDetailClient movie={movie} />;
}
