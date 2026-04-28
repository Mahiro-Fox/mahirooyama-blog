'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface CrudConfig<T> {
  apiPath: string;
  idField: keyof T;
  onSuccess?: (action: 'create' | 'update' | 'delete', item?: T) => void;
  onError?: (action: 'create' | 'update' | 'delete', error: Error) => void;
}

export interface CrudState<T> {
  items: T[];
  isLoading: boolean;
  isSubmitting: boolean;
  selectedItem: T | null;
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCrud<T extends Record<string, any>>(config: CrudConfig<T>) {
  const [state, setState] = useState<CrudState<T>>({
    items: [],
    isLoading: false,
    isSubmitting: false,
    selectedItem: null,
    isCreateDialogOpen: false,
    isEditDialogOpen: false,
    isDeleteDialogOpen: false,
  });

  // 获取列表
  const fetchItems = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(config.apiPath);
      if (!response.ok) throw new Error('获取数据失败');
      const data = await response.json();
      setState((prev) => ({ ...prev, items: data, isLoading: false }));
      return data;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取数据失败');
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [config.apiPath]);

  // 创建
  const createItem = useCallback(
    async (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
      setState((prev) => ({ ...prev, isSubmitting: true }));
      try {
        const response = await fetch(config.apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '创建失败');
        }

        const newItem = await response.json();
        toast.success('创建成功');
        setState((prev) => ({
          ...prev,
          items: [...prev.items, newItem],
          isSubmitting: false,
          isCreateDialogOpen: false,
        }));
        config.onSuccess?.('create', newItem);
        return newItem;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('创建失败');
        toast.error(err.message);
        config.onError?.('create', err);
        setState((prev) => ({ ...prev, isSubmitting: false }));
        throw error;
      }
    },
    [config]
  );

  // 更新
  const updateItem = useCallback(
    async (id: string, data: Partial<T>) => {
      setState((prev) => ({ ...prev, isSubmitting: true }));
      try {
        const response = await fetch(`${config.apiPath}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '更新失败');
        }

        const updatedItem = await response.json();
        toast.success('更新成功');
        setState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            String(item[config.idField]) === id ? updatedItem : item
          ),
          isSubmitting: false,
          isEditDialogOpen: false,
          selectedItem: null,
        }));
        config.onSuccess?.('update', updatedItem);
        return updatedItem;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('更新失败');
        toast.error(err.message);
        config.onError?.('update', err);
        setState((prev) => ({ ...prev, isSubmitting: false }));
        throw error;
      }
    },
    [config]
  );

  // 删除
  const deleteItem = useCallback(
    async (id: string, extraParams?: string) => {
      setState((prev) => ({ ...prev, isSubmitting: true }));
      try {
        const url = extraParams
          ? `${config.apiPath}/${id}?${extraParams}`
          : `${config.apiPath}/${id}`;
        const response = await fetch(url, { method: 'DELETE' });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '删除失败');
        }

        toast.success('删除成功');
        setState((prev) => ({
          ...prev,
          items: prev.items.filter(
            (item) => String(item[config.idField]) !== id
          ),
          isSubmitting: false,
          isDeleteDialogOpen: false,
          selectedItem: null,
        }));
        config.onSuccess?.('delete');
      } catch (error) {
        const err = error instanceof Error ? error : new Error('删除失败');
        toast.error(err.message);
        config.onError?.('delete', err);
        setState((prev) => ({ ...prev, isSubmitting: false }));
        throw error;
      }
    },
    [config]
  );

  // 对话框控制
  const openCreateDialog = useCallback(() => {
    setState((prev) => ({ ...prev, isCreateDialogOpen: true }));
  }, []);

  const openEditDialog = useCallback((item: T) => {
    setState((prev) => ({
      ...prev,
      selectedItem: item,
      isEditDialogOpen: true,
    }));
  }, []);

  const openDeleteDialog = useCallback((item: T) => {
    setState((prev) => ({
      ...prev,
      selectedItem: item,
      isDeleteDialogOpen: true,
    }));
  }, []);

  const closeDialogs = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isCreateDialogOpen: false,
      isEditDialogOpen: false,
      isDeleteDialogOpen: false,
      selectedItem: null,
    }));
  }, []);

  const setSubmitting = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, isSubmitting: value }));
  }, []);

  return {
    ...state,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeDialogs,
    setSubmitting,
    setState,
  };
}
