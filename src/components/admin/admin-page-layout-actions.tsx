'use client';

import { Plus, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export interface PageAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
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
