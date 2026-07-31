'use client';

import { toast } from 'sonner';
import { useCallback, useState } from 'react';
import type { ActionResponse } from '@/utils/action-response';

/**
 * 基于 Server Actions 的 CRUD Hook
 *
 * 将重复的 state 管理、对话框控制、CRUD 调用、错误处理抽到一起。
 * 页面只需提供 server actions 和表单渲染逻辑。
 */

export interface UseCrudConfig<
  T,
  CreateInput,
  UpdateInput = Partial<CreateInput>,
> {
  // === Server Actions ===
  /** 获取列表（必填） */
  getList: () => Promise<ActionResponse<T[]>>;
  /**
   * 创建（可选，bugs 等页面没有创建功能）。
   * 返回 data 放宽为 any（可能是 {id:string} 或完整 item 或 void）。
   */
  create?: (input: CreateInput) => Promise<ActionResponse<void>>;
  /**
   * 更新（可选，bugs 等页面用的是自定义 partial 更新）。
   * 返回 data 放宽为 any（可能是完整 item 或 void）。
   */
  update?: (id: string, input: UpdateInput) => Promise<ActionResponse<void>>;
  /** 删除（必填，所有 admin 页面都有） */
  delete: (id: string) => Promise<ActionResponse<void>>;

  // === Server Actions（可选） ===
  /**
   * 获取详情（用于编辑时重新拉取完整内容）。
   * 放宽返回 data 类型：实际接口可能返回"包含 T 的超集/子集"（如 Gallery 相对 AdminGallery），
   * hook 内部会把它赋值给 selectedItem（语义等价）。
   */
  getDetail?: (id: string) => Promise<ActionResponse<T>>;

  // === 标识字段（必填） ===
  /** 数据的唯一标识字段名，如 'id' / 'slug' */
  idField: keyof T;

  // === 成功提示（可选，不填则默认 "操作成功"） ===
  createSuccessMessage?: string;
  updateSuccessMessage?: string;
  deleteSuccessMessage?: string;

  // === 回调（可选） ===
  /** 创建成功后（toast + 刷新列表之后）调用 */
  onAfterCreate?: (item: T | void) => void;
  /** 更新成功后调用 */
  onAfterUpdate?: (item: T | void) => void;
  /** 删除成功后调用 */
  onAfterDelete?: () => void;
  /** fetchItems 成功后调用（可用于处理返回数据） */
  onAfterFetch?: (items: T[]) => void;

  // === 初始数据（可选，用于 SSR 预取） ===
  initialData?: T[];
}

export interface UseCrudReturn<
  T,
  CreateInput,
  UpdateInput = Partial<CreateInput>,
> {
  // === State ===
  items: T[];
  loading: boolean;
  isSubmitting: boolean;
  selectedItem: T | null;
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  /** 当前处于创建还是编辑模式 */
  editMode: 'create' | 'edit';

  // === CRUD ===
  /** 刷新列表（自动 loading + toast.error） */
  fetchItems: () => Promise<void>;
  /** 创建（自动 submitting + toast + 刷新 + 关对话框）。返回创建后的数据（如果 action 返回了的话） */
  createItem: (input: CreateInput) => Promise<T | void>;
  /** 更新（自动 submitting + toast + 刷新 + 关对话框） */
  updateItem: (id: string, input: UpdateInput) => Promise<T | void>;
  /** 删除（自动 submitting + toast + 刷新 + 关对话框） */
  deleteItem: () => Promise<void>;
  /** 手动设置 items（用于 bug-client 这种原地 patch 的场景） */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  /** 手动设置 submitting（用于特殊的多步骤保存场景） */
  setSubmitting: (value: boolean) => void;

  // === 对话框控制 ===
  /** 打开创建对话框（自动重置 selectedItem + 设为 create 模式） */
  openCreateDialog: () => void;
  /**
   * 打开编辑对话框：
   * - 如果配置了 getDetail，先拉取详情再打开
   * - 否则直接打开，用列表数据填充
   */
  openEditDialog: (item: T) => Promise<void>;
  /** 打开删除确认对话框 */
  openDeleteDialog: (item: T) => void;
  /** 关闭所有对话框并清空 selectedItem */
  closeDialogs: () => void;

  // === 对话框 setter（直接用于 Dialog onOpenChange） ===
  setIsCreateDialogOpen: (open: boolean) => void;
  setIsEditDialogOpen: (open: boolean) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
  /**
   * 手动设置 selectedItem（blog 等页面详情拉取到 string 而非 T 时使用,
   * 此时调用方自行解析详情内容填到表单, 仅用 selectedItem 存原列表项做 slug/title 显示）
   */
  setSelectedItem: (item: T | null) => void;
  /** 手动切换 editMode（create 或 edit） */
  setEditMode: (mode: 'create' | 'edit') => void;
}

export function useCrud<
  T extends Record<string, any>,
  CreateInput,
  UpdateInput = Partial<CreateInput>,
>(
  config: UseCrudConfig<T, CreateInput, UpdateInput>
): UseCrudReturn<T, CreateInput, UpdateInput> {
  const [items, setItems] = useState<T[]>(config.initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // ============================================================
  // 1. 获取列表
  // ============================================================
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await config.getList();
      if (!result.success) {
        throw new Error(result.error);
      }
      setItems(result.data);
      config.onAfterFetch?.(result.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取数据失败';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [config]);

  // ============================================================
  // 2. 创建
  // ============================================================
  const createItem = useCallback(
    async (input: CreateInput) => {
      if (!config.create) {
        toast.error('当前页面未配置创建操作');
        return;
      }
      setSubmitting(true);
      try {
        const result = await config.create(input);
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success(config.createSuccessMessage ?? '创建成功');
        setIsCreateDialogOpen(false);
        setEditMode('create');
        await fetchItems();
        config.onAfterCreate?.(result.data);
        return result.data;
      } catch (error) {
        const message = error instanceof Error ? error.message : '创建失败';
        toast.error(message);
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [config, fetchItems]
  );

  // ============================================================
  // 3. 更新
  // ============================================================
  const updateItem = useCallback(
    async (id: string, input: UpdateInput) => {
      if (!config.update) {
        toast.error('当前页面未配置更新操作');
        return;
      }
      setSubmitting(true);
      try {
        const result = await config.update(id, input);
        if (!result.success) {
          throw new Error(result.error);
        }
        toast.success(config.updateSuccessMessage ?? '更新成功');
        setIsEditDialogOpen(false);
        setSelectedItem(null);
        setEditMode('create');
        await fetchItems();
        config.onAfterUpdate?.(result.data);
        return result.data;
      } catch (error) {
        const message = error instanceof Error ? error.message : '更新失败';
        toast.error(message);
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [config, fetchItems]
  );

  // ============================================================
  // 4. 删除
  // ============================================================
  const deleteItem = useCallback(async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    const id = String(selectedItem[config.idField]);
    try {
      const result = await config.delete(id);
      if (!result.success) {
        throw new Error(result.error);
      }
      toast.success(config.deleteSuccessMessage ?? '删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      await fetchItems();
      config.onAfterDelete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除失败';
      toast.error(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [selectedItem, config, fetchItems]);

  // ============================================================
  // 5. 对话框控制
  // ============================================================
  const openCreateDialog = useCallback(() => {
    setSelectedItem(null);
    setEditMode('create');
    setIsCreateDialogOpen(true);
  }, []);

  const openEditDialog = useCallback(
    async (item: T) => {
      setSelectedItem(item);
      setEditMode('edit');

      // 如果配置了 getDetail，先拉取详情
      if (config.getDetail) {
        try {
          const id = String(item[config.idField]);
          const result = await config.getDetail(id);
          if (!result.success) {
            throw new Error(result.error);
          }
          setSelectedItem(result.data);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : '获取详情失败';
          toast.error(message);
          setSelectedItem(item);
        }
      }

      setIsEditDialogOpen(true);
    },
    [config]
  );

  const openDeleteDialog = useCallback((item: T) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  }, []);

  const closeDialogs = useCallback(() => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setSelectedItem(null);
    setEditMode('create');
  }, []);

  return {
    // State
    items,
    loading,
    isSubmitting,
    selectedItem,
    isCreateDialogOpen,
    isEditDialogOpen,
    isDeleteDialogOpen,
    editMode,

    // CRUD
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    setItems,
    setSubmitting,

    // 对话框控制（函数式）
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    closeDialogs,

    // 对话框 setter（用于 onOpenChange）
    setIsCreateDialogOpen,
    setIsEditDialogOpen,
    setIsDeleteDialogOpen,

    // 高级 setter（blog 等特殊页面自处理详情时使用）
    setSelectedItem,
    setEditMode,
  };
}
