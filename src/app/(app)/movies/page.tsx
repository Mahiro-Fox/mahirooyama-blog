import { getPublicMovies } from '@/actions/admin/movie-actions';

import { MoviesClient } from './movies-client';

export const metadata = {
  title: '私人影视收藏 - mahirooyama',
  description: '探索我的电影收藏，享受沉浸式观影体验',
};

export default async function MoviesPage() {
  const result = await getPublicMovies();
  const movies = result.success ? result.data : [];

  return <MoviesClient initialMovies={movies} />;
}
