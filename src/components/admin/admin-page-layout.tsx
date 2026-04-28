'use client';

import { ReactNode } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/shadcn-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';

interface PageAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

interface AdminPageLayoutProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: PageAction[];
  children: ReactNode;
  loading?: boolean;
}

export function AdminPageLayout({
  title,
  description,
  icon,
  actions = [],
  children,
  loading = false,
}: AdminPageLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <div>
                <CardTitle className="flex items-center gap-2">
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
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
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
    </div>
  );
}

// 预设的常用操作按钮
export const createRefreshAction = (
  onRefresh: () => void,
  loading?: boolean
): PageAction => ({
  label: '刷新',
  icon: <RefreshCw className="mr-2 h-4 w-4" />,
  onClick: onRefresh,
  variant: 'outline',
  loading,
});

export const createAddAction = (
  onAdd: () => void,
  label = '创建'
): PageAction => ({
  label,
  icon: <Plus className="mr-2 h-4 w-4" />,
  onClick: onAdd,
  variant: 'default',
});
