import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { PageTracker } from '@/components/shared/tracker';
import { getCurrentAdminUser } from '@/lib/admin-auth';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const adminUser = await getCurrentAdminUser();

  return (
    <div className="bg-background relative z-10 flex min-h-svh flex-col">
      <PageTracker />
      <SiteHeader initialIsAuth={!!adminUser} />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
