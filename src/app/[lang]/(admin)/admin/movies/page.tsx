import { redirect } from 'next/navigation';
import { adminGetMovies } from '@/actions/admin/movie-actions';

import { requirePermission } from '@/lib/permissions';
import MoviesClient from './movies-client';

export default async function MoviesAdminPage() {
  const permissionCheck = await requirePermission('movies:read');
  if (!permissionCheck.allowed) {
    redirect('/admin?toast=unauthorized&message=无权限访问影视管理');
  }

  const result = await adminGetMovies();
  const movies = result.success ? result.data : [];

  return <MoviesClient initialMovies={movies} />;
}
