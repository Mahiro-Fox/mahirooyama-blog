import { getPublicMovies } from '@/actions/admin/movie-actions';

import { MoviesClient } from './movies-client';

export default async function MoviesPage() {
  const result = await getPublicMovies();
  const movies = result.success ? result.data : [];

  return <MoviesClient initialMovies={movies} />;
}
