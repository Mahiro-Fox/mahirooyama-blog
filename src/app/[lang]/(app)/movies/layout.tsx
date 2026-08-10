import { ReactNode } from 'react';
import { getPublicMovies } from '@/actions/admin/movie-actions';
import { getDictionary } from '@/i18n/dictionary';
import { DictionaryProvider } from '@/i18n/dictionary-provider';

export const generateMetadata = async (params: Promise<{ lang: string }>) => {
  const { lang } = await params;
  const moviesDictionary = await getDictionary(lang, 'movies');
  return {
    title: moviesDictionary['movies.title'],
    description: moviesDictionary['movies.description'],
  };
};

interface MoviesLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}

export default async function MoviesLayout({
  children,
  params,
}: MoviesLayoutProps) {
  const { lang } = await params;
  const [moviesDictionary, moviesResult] = await Promise.all([
    getDictionary(lang, 'movies'),
    getPublicMovies(),
  ]);
  const movies = moviesResult.success ? moviesResult.data : [];

  return (
    <DictionaryProvider dictionary={moviesDictionary}>
      <div className="bg-background min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-12 text-center">
            <h1 className="mb-4 flex items-center justify-center gap-3 text-4xl font-bold">
              <span className="block h-7 w-1.5 rounded-full bg-[var(--primary)]" />
              {moviesDictionary['movies.title']}
            </h1>
            <p className="text-muted-foreground">
              {moviesDictionary['movies.description']}
            </p>
          </div>
          {movies.length > 0 && children}
        </div>
      </div>
    </DictionaryProvider>
  );
}
