'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import {
  FileText,
  FolderOpen,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Save,
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
import { Badge } from '@/components/shadcn-ui/badge';
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

interface GalleryFile {
  slug: string;
  fileName: string;
  title: string;
  description: string;
  src: string;
  tags: string[];
  size: number;
  updatedAt: string;
}

export default function GalleryAdminPage() {
  const router = useRouter();
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<GalleryFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('edit');
  const [editContent, setEditContent] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const [originalFileName, setOriginalFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);

  // 获取文件列表
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gallery-files');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '获取失败');
      }
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取文件列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 登出
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // 忽略错误
    }
    router.push('/admin/login');
    toast.success('已登出');
  };

  // 新增文件
  const handleCreate = () => {
    setEditMode('create');
    setSelectedFile(null);
    setEditFileName('');
    setOriginalFileName('');
    setEditContent(`---
title: ''
description: ''
thumbnail: ''
tags: []
---
`);
    setIsEditDialogOpen(true);
  };

  // 编辑文件
  const handleEdit = async (file: GalleryFile) => {
    try {
      const response = await fetch(`/api/gallery-files/${file.slug}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '获取失败');
      }
      const data = await response.json();
      setEditMode('edit');
      setSelectedFile(file);
      setEditFileName(file.slug);
      setOriginalFileName(file.fileName);
      setEditContent(data.content);
      setIsEditDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取文件内容失败');
    }
  };

  // 保存（新增或编辑）
  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editMode === 'create') {
        // 新增模式
        if (!editFileName.trim()) {
          toast.error('请输入文件名称');
          setIsSaving(false);
          return;
        }

        const response = await fetch('/api/gallery-files', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            slug: editFileName.trim(),
            content: editContent,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || '创建失败');
        }

        toast.success('文件创建成功');
      } else {
        // 编辑模式
        if (!selectedFile) return;

        let saveResponse = await fetch(
          `/api/gallery-files/${selectedFile.slug}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: editContent }),
          }
        );

        if (!saveResponse.ok) throw new Error('保存内容失败');

        // 如果文件名变更，执行重命名
        if (editFileName.trim() !== selectedFile.slug) {
          const renameResponse = await fetch(
            `/api/gallery-files/${selectedFile.slug}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                newSlug: editFileName.trim(),
              }),
            }
          );

          if (!renameResponse.ok) {
            const error = await renameResponse.json();
            throw new Error(error.error || '重命名失败');
          }
        }

        toast.success('文件保存成功');
      }

      setIsEditDialogOpen(false);
      fetchFiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 删除文件
  const handleDelete = async () => {
    if (!selectedFile) return;

    try {
      const response = await fetch(`/api/gallery-files/${selectedFile.slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '删除失败');
      }

      toast.success('文件删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    }
  };

  // 上传文件
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isYaml = file.name.endsWith('.yml') || file.name.endsWith('.yaml');
    if (!isYaml) {
      toast.error('只支持 .yml 或 .yaml 文件');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/gallery-files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '上传失败');
      }

      toast.success('文件上传成功');
      fetchFiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 截断文本
  const truncate = (text: string, maxLen: number) => {
    if (!text) return '-';
    return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
  };

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedFile) return;
      if (e.ctrlKey && e.code === 'KeyS') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedFile, editContent, handleSave]);

  return (
    <div className="bg-muted/30 min-h-screen">
      {/* 头部 */}
      <header className="bg-background border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Gallery 管理</h1>
            <Link
              href="/admin/blog"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
            >
              <FileText className="h-4 w-4" />
              Blog
            </Link>
            <Link
              href="/admin/public-files"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
            >
              <FolderOpen className="h-4 w-4" />
              Public 文件
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFiles}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              刷新列表
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              登出
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="mx-auto max-w-6xl p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>图片列表 ({files.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".yml,.yaml"
                onChange={handleUpload}
                disabled={isUploading}
                className="hidden"
                id="yaml-upload"
              />
              <Button
                variant="outline"
                onClick={handleCreate}
                disabled={isUploading}
              >
                <Plus className="mr-2 h-4 w-4" />
                新增 YML
              </Button>
              <Button asChild disabled={isUploading}>
                <label htmlFor="yaml-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? '上传中...' : '上传 YML'}
                </label>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>文件名</TableHead>
                  <TableHead>图片路径</TableHead>
                  <TableHead>标签</TableHead>
                  <TableHead>大小</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-8 text-center"
                    >
                      {loading ? '加载中...' : '暂无文件'}
                    </TableCell>
                  </TableRow>
                ) : (
                  files.map((file) => (
                    <TableRow key={file.slug}>
                      <TableCell className="cursor-pointer font-medium underline-offset-4 hover:underline">
                        <Link href={`/gallery/${file.slug}`}>{file.title}</Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {file.fileName}
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground max-w-[200px] truncate"
                        title={file.src}
                      >
                        {truncate(file.src, 30)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {file.tags?.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          )) || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatSize(file.size)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(file)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedFile(file);
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

        {/* 编辑/新增对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editMode === 'create'
                  ? '新增 YML 文件'
                  : `编辑: ${selectedFile?.title}`}
              </DialogTitle>
              <DialogDescription>
                {editMode === 'create'
                  ? '创建新的 Gallery 配置文件'
                  : selectedFile?.fileName}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">文件名称 (slug)</label>
                <Input
                  value={editFileName}
                  onChange={(e) => setEditFileName(e.target.value)}
                  placeholder="例如: my-image"
                  disabled={editMode === 'edit' && isSaving}
                  className="mt-1"
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {editMode === 'edit' &&
                  originalFileName !== `${editFileName}.yml`
                    ? '修改文件名将会重命名文件'
                    : '将生成文件: ' +
                      (editFileName ? `${editFileName}.yml` : '...')}
                </p>
              </div>
              <div className="h-[50vh] w-full">
                <Editor
                  height="100%"
                  defaultLanguage="yaml"
                  value={editContent}
                  onChange={(value) => setEditContent(value || '')}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    folding: true,
                    automaticLayout: true,
                    tabSize: 2,
                    fontSize: 14,
                  }}
                  theme="vs-dark"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !editFileName.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving
                  ? editMode === 'create'
                    ? '创建中...'
                    : '保存中...'
                  : editMode === 'create'
                    ? '创建'
                    : '保存'}
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
                确定要删除 &quot;{selectedFile?.title}&quot;
                吗？此操作无法撤销。
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
      </main>
    </div>
  );
}
