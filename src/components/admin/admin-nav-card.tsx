'use client';

import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';

interface AdminNavCardProps {
  href: string;
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
}

export function AdminNavCard({
  href,
  icon: Icon,
  label,
  title,
  description,
}: AdminNavCardProps) {
  return (
    <Link href={href}>
      <Card className="group cursor-pointer transition-all hover:shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground flex h-14 w-14 items-center justify-center rounded-xl transition-colors">
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-xl">{label}</CardTitle>
              <CardDescription>{title}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
