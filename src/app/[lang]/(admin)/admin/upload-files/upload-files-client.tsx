'use client';

import { useImagePreview } from '@/context/image-preview-provider';
import {
  ArrowLeft,
  Copy,
  File as FileIcon,
  Folder,
  FolderPlus,
  ImageDown,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  adminGetUploadFiles,
  cacheUploadPath,
  convertImages,
  createFolder,
  deleteFile,
  renameFile,
} from '@/actions/admin/upload-files-actions';
import { AdminPageLayout } from '@/components/admin/admin-page-layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn-ui/alert-dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/shadcn-ui/breadcrumb';
import { Button } from '@/components/shadcn-ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shadcn-ui/dialog';
import { Input } from '@/components/shadcn-ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn-ui/table';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_COUNT,
  MAX_TOTAL_SIZE,
} from '@/constant/file-upload';
import { formatDate, formatSize } from '@/utils/utils';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  lastUpdated: string;
  extension?: string;
}

interface FileListResponse {
  items: FileItem[];
  currentPath: string;
  breadcrumb: string[];
}

interface PublicFilesClientProps {
  initialData: FileListResponse;
}

// 是否是图片文件
const isImage = (item: FileItem) => {
  if (item.type !== 'file') return false;
  const imageExts = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.avif',
    '.ico',
  ];
  return imageExts.includes(item.extension || '');
};

// 复制路径到剪贴板
const copyPath = (path: string) => {
  navigator.clipboard.writeText(path);
  toast.success('路径已复制');
};

// 前端验证上传文件（数量与大小分开处理）
const validateFiles = (
  files: FileList
): { totalSize: number; errors: string[] } => {
  let totalSize = 0;
  const errors: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    totalSize += file.size;

    if (file.size > MAX_FILE_SIZE) {
      errors.push(
        `文件 ${file.name} 超过单文件限制 (${MAX_FILE_SIZE / (1024 * 1024)}MB)`
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push(`不支持的文件类型: ${file.name}`);
    }
  }

  return { totalSize, errors };
};

// 上传前校验（数量/总大小/单文件/类型），失败时返回 false
const validateUploadSelection = (files: FileList): boolean => {
  if (files.length > MAX_FILES_COUNT) {
    toast.error(`文件数量超过限制，最多允许 ${MAX_FILES_COUNT} 个文件`);
    return false;
  }

  const { totalSize, errors: validationErrors } = validateFiles(files);

  if (totalSize > MAX_TOTAL_SIZE) {
    toast.error(
      `文件总大小超过限制，最多允许 ${MAX_TOTAL_SIZE / (1024 * 1024)}MB`
    );
    return false;
  }

  if (validationErrors.length > 0) {
    validationErrors.forEach((err) => toast.error(err));
    return false;
  }

  return true;
};

// 执行上传并处理结果提示
const uploadFiles = async (path: string, files: FileList) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }

  const response = await fetch(
    `/api/upload-files?path=${encodeURIComponent(path)}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const result = await response.json();

  if (!response.ok) {
    if (result.details) {
      toast(result.error, {
        description: result.details?.join('\n') || '',
      });
    } else {
      toast.error(result.error || '上传失败');
    }
    return;
  }

  const successCount = result.results.filter(
    (r: { success: boolean }) => r.success
  ).length;
  const failCount = result.results.length - successCount;

  if (failCount === 0) {
    toast.success(`成功上传 ${successCount} 个文件`);
  } else {
    toast.warning(`${successCount} 成功, ${failCount} 失败`);
    result.results
      .filter((r: { success: boolean }) => !r.success)
      .forEach((r: { name: string; error: string }) => {
        toast.error(`${r.name}: ${r.error}`);
      });
  }
};

// 文件/目录缩略图
const Thumbnail = ({ item }: { item: FileItem }) => {
  if (item.type === 'directory') {
    return <Folder className="h-6 w-6 text-blue-500" />;
  } else {
    if (isImage(item)) {
      if (item.size <= 100 * 1024) {
        return (
          <Image
            src={item.path}
            alt={item.name}
            width={32}
            height={32}
            unoptimized
          />
        );
      } else {
        return <p>图片过大，请点击预览按钮进行预览</p>;
      }
    } else {
      return <FileIcon className="h-6 w-6 text-gray-500" />;
    }
  }
};

// 面包屑导航
function BreadcrumbNav({
  currentPath,
  breadcrumb,
  onGoBack,
  onHome,
  onNavigate,
}: {
  currentPath: string;
  breadcrumb: string[];
  onGoBack: () => void;
  onHome: () => void;
  onNavigate: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onGoBack}
        disabled={!currentPath}
        className="h-8 w-8"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={onHome} className="cursor-pointer">
              uploads
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumb.map((part, index) => {
            const crumbPath = breadcrumb.slice(0, index + 1).join('/');
            return (
              <BreadcrumbItem key={crumbPath}>
                <BreadcrumbSeparator />
                <BreadcrumbLink
                  onClick={() => onNavigate(index)}
                  className="cursor-pointer"
                >
                  {part}
                </BreadcrumbLink>
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

// 文件列表表格
function FileTable({
  items,
  onEnterFolder,
  onPreview,
  onRename,
  onDelete,
}: {
  items: FileItem[];
  onEnterFolder: (item: FileItem) => void;
  onPreview: (image: { src: string; alt: string }) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>类型</TableHead>
          <TableHead>名称</TableHead>
          <TableHead>路径</TableHead>
          <TableHead>大小</TableHead>
          <TableHead>更新时间</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-muted-foreground py-8 text-center"
            >
              暂无文件
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) => (
            <TableRow
              key={item.name}
              className={
                item.type === 'directory'
                  ? 'hover:bg-muted/50 cursor-pointer'
                  : ''
              }
              onClick={() => item.type === 'directory' && onEnterFolder(item)}
            >
              <TableCell>
                <Thumbnail item={item} />
              </TableCell>
              <TableCell className="max-w-20 overflow-hidden font-medium text-ellipsis">
                {item.name}
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  className="bg-muted cursor-pointer rounded px-2 py-1 font-mono text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyPath(item.path);
                  }}
                  title="点击复制"
                >
                  {item.path}
                </button>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.type === 'directory' ? '-' : formatSize(item.size)}
              </TableCell>
              <TableCell>{formatDate(item.lastUpdated)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {item.type === 'file' && isImage(item) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview({ src: item.path, alt: item.name });
                      }}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename(item);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

// 新建文件夹对话框
function NewFolderDialog({
  open,
  onOpenChange,
  value,
  onValueChange,
  isCreating,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  isCreating: boolean;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建文件夹</DialogTitle>
          <DialogDescription>在当前目录下创建新文件夹</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="文件夹名称"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            取消
          </Button>
          <Button onClick={onCreate} disabled={isCreating || !value.trim()}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 重命名对话框
function RenameDialog({
  open,
  onOpenChange,
  selectedName,
  value,
  onValueChange,
  isRenaming,
  onRename,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedName?: string;
  value: string;
  onValueChange: (value: string) => void;
  isRenaming: boolean;
  onRename: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名</DialogTitle>
          <DialogDescription>
            将 &quot;{selectedName}&quot; 重命名为：
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="新名称"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRenaming}
          >
            取消
          </Button>
          <Button onClick={onRename} disabled={isRenaming || !value.trim()}>
            {isRenaming ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 删除确认对话框
function DeleteFileDialog({
  open,
  onOpenChange,
  selectedItem,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItem: FileItem | null;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除?</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除 &quot;{selectedItem?.name}&quot; 吗？
            {selectedItem?.type === 'directory' &&
              ' 该文件夹内的所有内容将被一并删除。'}
            此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// AdminPageLayout 顶部操作
const buildActions = ({
  isConverting,
  isUploading,
  onNewFolder,
  onConvert,
  onUpload,
}: {
  isConverting: boolean;
  isUploading: boolean;
  onNewFolder: () => void;
  onConvert: () => void;
  onUpload: () => void;
}) => [
  {
    label: '新建文件夹',
    icon: <FolderPlus className="mr-2 h-4 w-4" />,
    onClick: onNewFolder,
    variant: 'outline' as const,
  },
  {
    label: 'PNG 转 WebP',
    icon: isConverting ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    ) : (
      <ImageDown className="mr-2 h-4 w-4" />
    ),
    onClick: onConvert,
    variant: 'outline' as const,
    disabled: isConverting,
  },
  {
    label: '上传文件',
    icon: isUploading ? (
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    ) : (
      <Upload className="mr-2 h-4 w-4" />
    ),
    onClick: onUpload,
    variant: 'default' as const,
    disabled: isUploading,
  },
];

export default function UploadFilesClient({
  initialData,
}: PublicFilesClientProps) {
  const [currentPath, setCurrentPath] = useState(initialData.currentPath);
  const [data, setData] = useState<FileListResponse>(initialData);
  const hasMountedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FileItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const { openPreview } = useImagePreview();
  const [isConverting, setIsConverting] = useState(false);

  // 获取文件列表
  const fetchFiles = useCallback(async (path: string = '') => {
    try {
      setLoading(true);
      const result = await adminGetUploadFiles(path);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        if (!result.success) {
          toast.error(result.error || '获取文件列表失败');
        }
      }
    } catch {
      toast.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    fetchFiles(currentPath);
  }, [currentPath, fetchFiles]);

  // 缓存当前路径到服务端
  useEffect(() => {
    // 防抖或仅在 currentPath 存在时触发
    let isMounted = true;

    const cachePath = async () => {
      const result = await cacheUploadPath(currentPath);
      if (!result.success && isMounted) {
        console.error('缓存路径失败:', result.error);
      }
    };

    cachePath();

    return () => {
      isMounted = false; // 👈 标记卸载即可，绝对不要在 return 里调用异步请求！
    };
  }, [currentPath]);

  // 进入文件夹
  const enterFolder = (folder: FileItem) => {
    if (folder.type === 'directory') {
      const newPath = currentPath
        ? `${currentPath}/${folder.name}`
        : folder.name;
      setCurrentPath(newPath);
    }
  };

  // 返回上级目录
  const goBack = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  // 点击面包屑跳转
  const navigateToBreadcrumb = (index: number) => {
    if (!data) return;
    const parts = data.breadcrumb.slice(0, index + 1);
    setCurrentPath(parts.join('/'));
  };

  // 新建文件夹
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsCreatingFolder(true);
    try {
      const result = await createFolder(currentPath, newFolderName.trim());

      if (result.success) {
        toast.success('文件夹创建成功');
        setIsNewFolderDialogOpen(false);
        setNewFolderName('');
        await fetchFiles(currentPath);
      } else {
        toast.error(result.error || '创建失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // 上传文件
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    // 前端验证
    if (!validateUploadSelection(selectedFiles)) {
      e.target.value = '';
      return;
    }

    setIsUploading(true);

    try {
      await uploadFiles(currentPath, selectedFiles);
      fetchFiles(currentPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // 删除文件/文件夹
  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      const result = await deleteFile(selectedItem.path);

      if (result.success) {
        toast.success(
          selectedItem.type === 'directory' ? '文件夹删除成功' : '文件删除成功'
        );
        setIsDeleteDialogOpen(false);
        setSelectedItem(null);
        fetchFiles(currentPath);
      } else {
        toast.error(result.error || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  // 重命名
  const handleRename = async () => {
    if (!selectedItem || !newName.trim()) return;

    setIsRenaming(true);
    try {
      const result = await renameFile(selectedItem.path, newName.trim());

      if (result.success) {
        toast.success('重命名成功');
        setIsRenameDialogOpen(false);
        setNewName('');
        fetchFiles(currentPath);
      } else {
        toast.error(result.error || '重命名失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重命名失败');
    } finally {
      setIsRenaming(false);
    }
  };

  // 打开重命名对话框
  const openRenameDialog = (item: FileItem) => {
    setSelectedItem(item);
    setNewName(item.name);
    setIsRenameDialogOpen(true);
  };

  // PNG 转 WebP
  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const result = await convertImages();

      if (result.success) {
        toast.success(result.data.message || '转换完成');
        fetchFiles(currentPath);
      } else {
        toast.error(result.error || '转换失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '转换失败');
    } finally {
      setIsConverting(false);
    }
  };

  const items = data?.items || [];

  const actions = buildActions({
    isConverting,
    isUploading,
    onNewFolder: () => setIsNewFolderDialogOpen(true),
    onConvert: handleConvert,
    onUpload: () => document.getElementById('file-upload')?.click(),
  });

  return (
    <>
      <AdminPageLayout
        title={
          <BreadcrumbNav
            currentPath={currentPath}
            breadcrumb={data?.breadcrumb ?? []}
            onGoBack={goBack}
            onHome={() => setCurrentPath('')}
            onNavigate={navigateToBreadcrumb}
          />
        }
        description={`文件列表 (${items.length})`}
        actions={actions}
        loading={loading}
      >
        <FileTable
          items={items}
          onEnterFolder={enterFolder}
          onPreview={openPreview}
          onRename={openRenameDialog}
          onDelete={(item) => {
            setSelectedItem(item);
            setIsDeleteDialogOpen(true);
          }}
        />
      </AdminPageLayout>

      <Input
        type="file"
        onChange={handleUpload}
        disabled={isUploading}
        className="hidden"
        id="file-upload"
        multiple
      />

      <NewFolderDialog
        open={isNewFolderDialogOpen}
        onOpenChange={setIsNewFolderDialogOpen}
        value={newFolderName}
        onValueChange={setNewFolderName}
        isCreating={isCreatingFolder}
        onCreate={handleCreateFolder}
      />

      <RenameDialog
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        selectedName={selectedItem?.name}
        value={newName}
        onValueChange={setNewName}
        isRenaming={isRenaming}
        onRename={handleRename}
      />

      <DeleteFileDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        selectedItem={selectedItem}
        onConfirm={handleDelete}
      />
    </>
  );
}
