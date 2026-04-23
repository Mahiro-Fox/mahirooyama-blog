'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import {
  FolderOpen,
  ImageIcon,
  LogOut,
  Pencil,
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

interface MdxFile {
  slug: string;
  fileName: string;
  title: string;
  description: string;
  createdAt: string;
  tags: string[];
  size: number;
  updatedAt: string;
}

export default function BlogAdminPage() {
  const router = useRouter();
  const [files, setFiles] = useState<MdxFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<MdxFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);

  // 获取文件列表
  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mdx-files');
      if (!response.ok) throw new Error('获取失败');
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      toast.error('获取文件列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

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
  }, [selectedFile, editContent]);

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

  // 手动刷新缓存
  const handleRevalidate = async () => {
    setIsRevalidating(true);
    try {
      const response = await fetch('/api/revalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'all' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '刷新失败');
      }

      const data = await response.json();
      toast.success('页面缓存已刷新，1小时内生效');
      console.log('刷新结果:', data.results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '刷新缓存失败');
    } finally {
      setIsRevalidating(false);
    }
  };

  // 编辑文件
  const handleEdit = async (file: MdxFile) => {
    try {
      const response = await fetch(`/api/mdx-files/${file.slug}`);
      if (!response.ok) throw new Error('获取失败');
      const data = await response.json();
      setSelectedFile(file);
      setEditContent(data.content);
      console.log(data.content);
      setIsEditDialogOpen(true);
    } catch (error) {
      toast.error('获取文件内容失败');
    }
  };

  // 保存编辑
  const handleSave = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/mdx-files/${selectedFile.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) throw new Error('保存失败');

      toast.success('文件保存成功');
      setIsEditDialogOpen(false);
      fetchFiles();
    } catch (error) {
      toast.error('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 删除文件
  const handleDelete = async () => {
    if (!selectedFile) return;

    try {
      const response = await fetch(`/api/mdx-files/${selectedFile.slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('删除失败');

      toast.success('文件删除成功');
      setIsDeleteDialogOpen(false);
      setSelectedFile(null);
      fetchFiles();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  // 上传文件
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.mdx')) {
      toast.error('只支持 .mdx 文件');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/mdx-files', {
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

  // 格式化日期
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  return (
    <div className="bg-muted/30 min-h-screen">
      {/* 头部 */}
      <header className="bg-background border-b px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Blog 管理</h1>
            <Link
              href="/admin/gallery"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
            >
              <ImageIcon className="h-4 w-4" />
              Gallery
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevalidate}
              disabled={isRevalidating}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRevalidating ? 'animate-spin' : ''}`}
              />
              刷新页面缓存
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
            <CardTitle>文章列表 ({files.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".mdx"
                onChange={handleUpload}
                disabled={isUploading}
                className="hidden"
                id="mdx-upload"
              />
              <Button asChild disabled={isUploading}>
                <label htmlFor="mdx-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? '上传中...' : '上传 MDX'}
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
                  <TableHead>日期</TableHead>
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
                        <Link href={`/blog/${file.slug}`}>{file.title}</Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {file.fileName}
                      </TableCell>
                      <TableCell>{formatDate(file.createdAt)}</TableCell>
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

        {/* 编辑对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>编辑: {selectedFile?.title}</DialogTitle>
              <DialogDescription>{selectedFile?.fileName}</DialogDescription>
            </DialogHeader>
            <div className="mt-4 h-[60vh] w-full">
              <Editor
                height="100%"
                defaultLanguage="markdown"
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
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                取消
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? '保存中...' : '保存'}
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
