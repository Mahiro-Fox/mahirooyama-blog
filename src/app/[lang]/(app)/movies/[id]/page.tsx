import { notFound } from 'next/navigation';
import { getPublicMovies } from '@/actions/admin/movie-actions';
import { getDictionary } from '@/i18n/dictionary';
import { Movie } from '@/lib/movies';
import { MovieDetailClient } from './movie-detail-client';

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string; lang: string }>;
}) => {
  const { id, lang } = await params;
  const result = await getPublicMovies();
  const movies = result.success ? result.data : [];
  const movie = movies.find((m: Movie) => m.id === id);
  const moviesDictionary = await getDictionary(lang, 'movies');

  return {
    title: movie
      ? (moviesDictionary['movies.movie_detail_title'] as string).replace(
          '{{title}}',
          movie.title
        )
      : (moviesDictionary['movies.movie_not_found'] as string),
    description:
      movie?.summary || (moviesDictionary['movies.page_description'] as string),
  };
};

export default async function MoviePlayPage({
  params,
}: {
  params: Promise<{ id: string; lang: string }>;
}) {
  const { id } = await params;
  const result = await getPublicMovies();
  const movies = result.success ? result.data : [];
  const movie = movies.find((m: Movie) => m.id === id);

  if (!movie) {
    notFound();
  }

  return <MovieDetailClient movie={movie} />;
}
