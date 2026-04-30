'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { resolveImageSrc } from '@/utils/client-image-utils';
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
  X,
} from 'lucide-react';
import { toast } from 'sonner';

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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';
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

// 格式化文件大小
const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

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

export default function PublicFilesClient({
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
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // 获取文件列表
  const fetchFiles = useCallback(async (path: string = '') => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/public-files?path=${encodeURIComponent(path)}`
      );
      if (!response.ok) throw new Error('获取失败');
      const result = await response.json();
      setData(result);
    } catch (error) {
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
  }, [currentPath, fetchFiles, initialData.currentPath]);

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
      const response = await fetch(
        `/api/public-files?path=${encodeURIComponent(currentPath)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ folderName: newFolderName.trim() }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '创建失败');
      }

      toast.success('文件夹创建成功');
      setIsNewFolderDialogOpen(false);
      setNewFolderName('');
      fetchFiles(currentPath);
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

    setIsUploading(true);

    try {
      const formData = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }

      const response = await fetch(
        `/api/public-files?path=${encodeURIComponent(currentPath)}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '上传失败');
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
      const response = await fetch(`/api/public-files${selectedItem.path}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');

      toast.success(
        selectedItem.type === 'directory' ? '文件夹删除成功' : '文件删除成功'
      );
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      fetchFiles(currentPath);
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 重命名
  const handleRename = async () => {
    if (!selectedItem || !newName.trim()) return;

    setIsRenaming(true);
    try {
      const response = await fetch(`/api/public-files${selectedItem.path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newName: newName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '重命名失败');
      }

      toast.success('重命名成功');
      setIsRenameDialogOpen(false);
      setNewName('');
      fetchFiles(currentPath);
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

  // 复制路径到剪贴板
  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    toast.success('路径已复制');
  };

  // PNG 转 WebP
  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const response = await fetch('/api/convert-images', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '转换失败');
      }

      toast.success(result.message || '转换完成');
      fetchFiles(currentPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '转换失败');
    } finally {
      setIsConverting(false);
    }
  };

  const items = data?.items || [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              {/* 返回上级按钮 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                disabled={!currentPath}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              {/* 面包屑导航 */}
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={() => setCurrentPath('')}
                      className="cursor-pointer"
                    >
                      public
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {data?.breadcrumb.map((part, index) => (
                    <BreadcrumbItem key={index}>
                      <BreadcrumbSeparator />
                      <BreadcrumbLink
                        onClick={() => navigateToBreadcrumb(index)}
                        className="cursor-pointer"
                      >
                        {part}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="file"
                onChange={handleUpload}
                disabled={isUploading}
                className="hidden"
                id="file-upload"
                multiple
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewFolderDialogOpen(true)}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                新建文件夹
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleConvert}
                disabled={isConverting}
              >
                {isConverting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ImageDown className="mr-2 h-4 w-4" />
                )}
                PNG 转 WebP
              </Button>
              <Button asChild size="sm" disabled={isUploading}>
                <label htmlFor="file-upload" className="cursor-pointer">
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  上传文件
                </label>
              </Button>
            </div>
          </div>

          <CardTitle>文件列表 ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
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
                    onClick={() =>
                      item.type === 'directory' && enterFolder(item)
                    }
                  >
                    <TableCell>
                      {item.type === 'directory' ? (
                        <Folder className="h-6 w-6 text-blue-500" />
                      ) : isImage(item) ? (
                        <p>不展示预览，请点击预览按钮进行预览</p>
                      ) : (
                        <FileIcon className="h-6 w-6 text-gray-500" />
                      )}
                    </TableCell>
                    <TableCell className="max-w-20 overflow-hidden font-medium text-ellipsis">
                      {item.name}
                    </TableCell>
                    <TableCell>
                      <code
                        className="bg-muted cursor-pointer rounded px-2 py-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPath(item.path);
                        }}
                        title="点击复制"
                      >
                        {item.path}
                      </code>
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
                              setPreviewItem(item);
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
                            openRenameDialog(item);
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
                            setSelectedItem(item);
                            setIsDeleteDialogOpen(true);
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
        </CardContent>
      </Card>

      {/* 图片预览对话框 */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewItem?.name}</DialogTitle>
            <DialogDescription>
              {previewItem && formatSize(previewItem.size)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            {previewItem && (
              <Image
                src={resolveImageSrc(previewItem.path)}
                alt={previewItem.name}
                className="max-h-[60vh] rounded-lg object-contain"
                width={400}
                height={400}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewItem(null)}>
              <X className="mr-2 h-4 w-4" />
              关闭
            </Button>
            <Button onClick={() => previewItem && copyPath(previewItem.path)}>
              复制路径
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新建文件夹对话框 */}
      <Dialog
        open={isNewFolderDialogOpen}
        onOpenChange={setIsNewFolderDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建文件夹</DialogTitle>
            <DialogDescription>在当前目录下创建新文件夹</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="文件夹名称"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewFolderDialogOpen(false)}
              disabled={isCreatingFolder}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={isCreatingFolder || !newFolderName.trim()}
            >
              {isCreatingFolder ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重命名对话框 */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名</DialogTitle>
            <DialogDescription>
              将 &quot;{selectedItem?.name}&quot; 重命名为：
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新名称"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRenameDialogOpen(false)}
              disabled={isRenaming}
            >
              取消
            </Button>
            <Button
              onClick={handleRename}
              disabled={isRenaming || !newName.trim()}
            >
              {isRenaming ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
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
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
