'use client';

import { Loader2 } from 'lucide-react';
import { ReactNode } from 'react';
import { Button } from '@/components/shadcn-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';
import { type PageAction } from './admin-page-layout-actions';

export {
  createAddAction,
  createRefreshAction,
} from './admin-page-layout-actions';

interface AdminPageLayoutProps {
  title: ReactNode | string;
  description?: string;
  icon?: ReactNode;
  actions?: PageAction[];
  primaryActions?: ReactNode[];
  children: ReactNode;
  loading?: boolean;
}

export function AdminPageLayout({
  title,
  description,
  icon,
  actions = [],
  primaryActions = [],
  children,
  loading = false,
}: AdminPageLayoutProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <CardTitle className="mb-2 flex items-center gap-2">
                {title}
              </CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
          {actions.length > 0 && (
            <div className="flex gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || 'default'}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                >
                  {action.loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    action.icon
                  )}
                  {action.label}
                </Button>
              ))}
              {primaryActions.length > 0 &&
                primaryActions.map((action) => action)}
            </div>
          )}
        </div>
      </CardHeader>

      {/* Primary Actions Area */}

      <CardContent className="max-h-[70vh] overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">加载中...</span>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
