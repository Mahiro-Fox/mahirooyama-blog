'use client';

import { adminRoutesConfig } from '@/lib/config';
import { AdminNavCard } from '@/components/admin/admin-nav-card';

export default function AdminPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {adminRoutesConfig.map((config) =>
        config.adminHref ? (
          <AdminNavCard
            key={config.name}
            href={config.adminHref}
            icon={config.icon}
            label={config.label}
            title={config.title}
            description={config.description}
          />
        ) : null
      )}
    </div>
  );
}
