// #!/usr/bin/env node
// import fs from 'fs/promises';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// const PROJECT_ROOT = path.join(__dirname, '..');

// // 模板定义
// const TEMPLATES = {
//   // 1. 数据层模板
//   lib: (name, Name, fields) => `import fs from 'fs';
// import path from 'path';
// import matter from 'gray-matter';

// import { paginateItems, PaginationResult } from '@/lib/pagination';

// const ${name}Dir = path.join(process.cwd(), 'src', 'content', '${name}');

// export const DEFAULT_${name.toUpperCase()}_LIMIT = 12;

// export type ${Name}Item<T = {}> = {
// ${fields.map((f) => `  ${f.name}: ${f.type};`).join('\n')}
// } & T;

// export type ${Name}Data<T = {}> = {
//   metadata: ${Name}Item<T>;
//   slug: string;
// };

// export async function getAll${Name}Items<T = {}>(): Promise<
//   ${Name}Data<T>[]
// > {
//   try {
//     await fs.promises.access(${name}Dir);
//   } catch {
//     return [];
//   }

//   const files = await get${Name}Files();
//   const items = await Promise.all(
//     files.map((file) => read${Name}File<T>(path.join(${name}Dir, file)))
//   );

//   return items.sort((a, b) => a.slug.localeCompare(b.slug));
// }

// export async function get${Name}ByTagSlug(
//   tagSlug: string
// ): Promise<${Name}Data<{}>[] | undefined> {
//   const items = await getAll${Name}Items<{}>();
//   return items.filter((item) => item.metadata.tags?.includes(tagSlug));
// }

// export async function get${Name}Items<T = {}>(
//   page = 1,
//   pageSize = DEFAULT_${name.toUpperCase()}_LIMIT
// ): Promise<PaginationResult<${Name}Data<T>>> {
//   const items = await getAll${Name}Items<T>();
//   return paginateItems(items, page, pageSize);
// }

// export async function get${Name}BySlug<T = {}>(
//   slug: string
// ): Promise<${Name}Data<T> | undefined> {
//   const items = await getAll${Name}Items<T>();
//   return items.find((item) => item.slug === slug);
// }

// async function get${Name}Files(): Promise<string[]> {
//   return (await fs.promises.readdir(${name}Dir)).filter(
//     (file) => path.extname(file) === '.yml' || path.extname(file) === '.yaml'
//   );
// }

// async function read${Name}File<T>(
//   filePath: string
// ): Promise<${Name}Data<T>> {
//   const rawContent = await fs.promises.readFile(filePath, 'utf-8');
//   const { data } = matter(rawContent);

//   return {
//     metadata: data as ${Name}Item<T>,
//     slug: path.basename(filePath, path.extname(filePath)),
//   };
// }
// `,

//   // 2. API 列表路由模板
//   apiList: (name, Name) => `import fs from 'fs/promises';
// import path from 'path';
// import { NextRequest, NextResponse } from 'next/server';
// import matter from 'gray-matter';

// const ${name.toUpperCase()}_DIR = path.join(process.cwd(), 'src', 'content', '${name}');

// export async function GET() {
//   try {
//     const files = await fs.readdir(${name.toUpperCase()}_DIR);
//     const yamlFiles = files.filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));

//     const items = await Promise.all(
//       yamlFiles.map(async (file) => {
//         const filePath = path.join(${name.toUpperCase()}_DIR, file);
//         const content = await fs.readFile(filePath, 'utf-8');
//         const parsed = matter(content);
//         const stats = await fs.stat(filePath);

//         return {
//           slug: path.basename(file, path.extname(file)),
//           fileName: file,
//           ...parsed.data,
//           size: stats.size,
//           updatedAt: stats.mtime.toISOString(),
//         };
//       })
//     );

//     return NextResponse.json(items);
//   } catch (error) {
//     console.error('获取列表失败:', error);
//     return NextResponse.json({ error: '获取列表失败' }, { status: 500 });
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get('file') as File | null;

//     if (!file) {
//       return NextResponse.json({ error: '没有提供文件' }, { status: 400 });
//     }

//     const ext = path.extname(file.name).toLowerCase();
//     if (ext !== '.yml' && ext !== '.yaml') {
//       return NextResponse.json({ error: '只接受 .yml 或 .yaml 文件' }, { status: 400 });
//     }

//     const content = await file.text();
//     const parsed = matter(content);

//     if (!parsed.data.title) {
//       return NextResponse.json({ error: '缺少必需的 frontmatter 字段 (title)' }, { status: 400 });
//     }

//     const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
//     const filePath = path.join(${name.toUpperCase()}_DIR, fileName);

//     try {
//       await fs.access(filePath);
//       return NextResponse.json({ error: \`文件 \${fileName} 已存在\` }, { status: 409 });
//     } catch {
//       // 文件不存在
//     }

//     await fs.mkdir(${name.toUpperCase()}_DIR, { recursive: true });
//     await fs.writeFile(filePath, content, 'utf-8');

//     return NextResponse.json({ message: '上传成功', fileName }, { status: 201 });
//   } catch (error) {
//     console.error('上传失败:', error);
//     return NextResponse.json({ error: '上传失败' }, { status: 500 });
//   }
// }
// `,

//   // 3. API 单个资源路由模板
//   apiDetail: (name, Name) => `import fs from 'fs/promises';
// import path from 'path';
// import { NextRequest, NextResponse } from 'next/server';

// const ${name.toUpperCase()}_DIR = path.join(process.cwd(), 'src', 'content', '${name}');

// interface RouteParams {
//   params: Promise<{ slug: string }>;
// }

// export async function GET(request: NextRequest, { params }: RouteParams) {
//   try {
//     const { slug } = await params;
//     const filePath = path.join(${name.toUpperCase()}_DIR, \`\${slug}.yml\`);
//     const content = await fs.readFile(filePath, 'utf-8');
//     return NextResponse.json({ content });
//   } catch (error) {
//     return NextResponse.json({ error: '文件不存在' }, { status: 404 });
//   }
// }

// export async function PUT(request: NextRequest, { params }: RouteParams) {
//   try {
//     const { slug } = await params;
//     const { content } = await request.json();
//     const filePath = path.join(${name.toUpperCase()}_DIR, \`\${slug}.yml\`);
//     await fs.writeFile(filePath, content, 'utf-8');
//     return NextResponse.json({ message: '更新成功' });
//   } catch (error) {
//     return NextResponse.json({ error: '更新失败' }, { status: 500 });
//   }
// }

// export async function DELETE(request: NextRequest, { params }: RouteParams) {
//   try {
//     const { slug } = await params;
//     const filePath = path.join(${name.toUpperCase()}_DIR, \`\${slug}.yml\`);
//     await fs.unlink(filePath);
//     return NextResponse.json({ message: '删除成功' });
//   } catch (error) {
//     return NextResponse.json({ error: '删除失败' }, { status: 500 });
//   }
// }
// `,

//   // 4. 列表页模板
//   listPage: (name, Name) => `import { notFound } from 'next/navigation';

// import { get${Name}Items } from '@/lib/${name}';
// import { formatDate } from '@/lib/utils';
// import { AboutCta } from '@/components/shared/about-cta';
// import { LinkCard } from '@/components/shared/link-card';
// import { Pagination } from '@/components/shared/pagination';

// export const dynamic = 'force-static';
// export const revalidate = false;
// export const dynamicParams = false;

// interface ${Name}ListPageProps {
//   params: Promise<{ page: string }>;
// }

// export async function generateStaticParams() {
//   const { totalPages } = await get${Name}Items();
//   return Array.from({ length: totalPages }, (_, i) => ({
//     page: String(i + 1),
//   }));
// }

// export default async function ${Name}ListPage({ params }: ${Name}ListPageProps) {
//   const { page } = await params;
//   const pageNum = Number.parseInt(page);

//   if (isNaN(pageNum)) return notFound();

//   const { items, currentPage, totalPages } = await get${Name}Items(pageNum);

//   if (currentPage > totalPages) return notFound();

//   return (
//     <div className="flex flex-1 flex-col">
//       <div className="container-wrapper">
//         <div className="container py-6">
//           <AboutCta />
//         </div>
//       </div>
//       <div className="container-wrapper">
//         <div className="container flex flex-col gap-1">
//           <section className="container border-b py-6">
//             <div className="flex flex-col gap-1 pb-6">
//               <h2 className="text-2xl font-medium tracking-tight">Paginated ${Name} List</h2>
//             </div>
//             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
//               {items.map((item, index) => {
//                 // 首屏前3个项目优先加载，其余懒加载
//                 const isPriority = index < 3 && currentPage === 1;

//                 return (
//                   <LinkCard
//                     key={item.slug}
//                     title={item.metadata.title}
//                     imageUrl={item.metadata.thumbnail || '/og.webp'}
//                     link={\`/${name}/\${item.slug}\`}
//                     badgeText={item.metadata.createdAt ? formatDate(item.metadata.createdAt) : undefined}
//                     description={item.metadata.description}
//                     priority={isPriority}
//                   />
//                 );
//               })}
//             </div>
//           </section>
//         </div>
//       </div>
//       <Pagination
//         currentPage={currentPage}
//         totalPages={totalPages}
//         basePath="/page/${name}"
//       />
//     </div>
//   );
// }
// `,

//   // 5. 详情页模板
//   detailPage: (name, Name, fields) => `import type { Metadata } from 'next';
// import { notFound } from 'next/navigation';

// import { getAll${Name}Items, get${Name}BySlug } from '@/lib/${name}';
// import { ${name}Tags } from '@/lib/tag';
// import { formatDate } from '@/lib/utils';

// import { BlurFade } from '@/components/shadcn-ui/blur-fade';
// import { Breadcrumb } from '@/components/layout/breadcrumb';
// import { LinkBadge } from '@/components/shared/link-badge';
// import { OptimizedImage, imageSizes } from '@/components/shared/optimized-image';

// interface ${Name}PageProps {
//   params: Promise<{
//     slug: string;
//   }>;
// }

// export async function generateStaticParams() {
//   const items = await getAll${Name}Items();
//   return items.map((item) => ({
//     slug: item.slug,
//   }));
// }

// export async function generateMetadata({
//   params,
// }: ${Name}PageProps): Promise<Metadata> {
//   const { slug } = await params;
//   const item = await get${Name}BySlug(slug);

//   if (!item) {
//     return {
//       title: 'Not Found',
//     };
//   }

//   return {
//     title: item.metadata.title,
//     description: item.metadata.description,
//   };
// }

// export default async function ${Name}Page({ params }: ${Name}PageProps) {
//   const { slug } = await params;
//   const item = await get${Name}BySlug(slug);

//   if (!item) {
//     notFound();
//   }

//   const breadcrumbItems = [
//     ...(item.metadata.tags && item.metadata.tags.length > 0
//       ? [
//           {
//             link: \`/tag/${name}/\${item.metadata.tags[0]}\`,
//             label: ${name}Tags[item.metadata.tags[0]]?.name || item.metadata.tags[0],
//           },
//         ]
//       : []),
//     {
//       link: '',
//       label: item.metadata.title,
//     },
//   ];

//   const thumbnail = item.metadata.thumbnail;

//   return (
//     <div className="container-wrapper">
//       <div className="container py-8">
//         <div className="container">
//           <div className="py-4 lg:block">
//             <Breadcrumb items={breadcrumbItems} />
//           </div>
//         </div>
//         <div className="mx-auto max-w-4xl">
//           <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
//             <OptimizedImage
//               src={thumbnail || '/og.webp'}
//               alt={item.metadata.title}
//               fill
//               aspectRatio={16 / 9}
//               sizes={imageSizes.detail}
//               priority
//             />
//           </div>
//           <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-2 text-[11px] md:text-xs">
//             {item.metadata.createdAt && (
//               <div className="inline-flex items-center gap-1">
//                 <time dateTime={item.metadata.createdAt}>
//                   {\`\${formatDate(item.metadata.createdAt)}\`}
//                 </time>
//               </div>
//             )}
//             <div className="hidden flex-wrap gap-2 md:flex">
//               {item.metadata.tags?.map((tagSlug) => (
//                 <LinkBadge
//                   key={tagSlug}
//                   link={\`/tag/${name}/\${tagSlug}\`}
//                   label={${name}Tags[tagSlug]?.name || tagSlug}
//                 />
//               ))}
//             </div>
//           </div>

//           <BlurFade inView delay={0.15} duration={0.5}>
//             <div className="mt-6 space-y-2">
//               <h1 className="text-2xl font-medium tracking-tight">
//                 {item.metadata.title}
//               </h1>
//               {item.metadata.description && (
//                 <p className="text-muted-foreground">
//                   {item.metadata.description}
//                 </p>
//               )}
//             </div>
//           </BlurFade>
//         </div>
//       </div>
//     </div>
//   );
// }
// `,

//   // 6. Tag 页模板
//   tagPage: (name, Name) => `import { notFound } from 'next/navigation';

// import { siteConfig } from '@/lib/config';
// import { get${Name}ByTagSlug } from '@/lib/${name}';
// import { ${name}Tags } from '@/lib/tag';
// import { absoluteUrl, formatDate } from '@/lib/utils';
// import { Badge } from '@/components/shadcn-ui/badge';
// import { TextAnimate } from '@/components/shadcn-ui/text-animate';
// import { Breadcrumb } from '@/components/layout/breadcrumb';
// import { AboutCta } from '@/components/shared/about-cta';
// import { BrandIcons } from '@/components/shared/brand-icons';
// import { LinkCard } from '@/components/shared/link-card';

// export const dynamic = 'force-static';
// export const revalidate = false;
// export const dynamicParams = false;

// interface ${Name}TagPageProps {
//   params: Promise<{ slug: string }>;
// }

// export async function generateStaticParams() {
//   return Object.keys(${name}Tags).map((slug) => ({ slug }));
// }

// export async function generateMetadata({ params }: ${Name}TagPageProps) {
//   const { slug } = await params;
//   const tag = ${name}Tags[slug];

//   if (!tag) {
//     return {};
//   }

//   return {
//     title: \`\${tag.name} ${Name}\`,
//     description: \`Browse all \${tag.name} tagged ${Name.toLowerCase()}\`,
//     openGraph: {
//       title: \`\${tag.name} ${Name}\`,
//       description: \`Browse all \${tag.name} tagged ${Name.toLowerCase()}\`,
//       type: 'article',
//       url: absoluteUrl(\`/tag/${name}/\${slug}\`),
//       images: [
//         {
//           url: siteConfig.ogImage,
//           width: 1200,
//           height: 630,
//           alt: \`\${tag.name} ${Name}\`,
//         },
//       ],
//     },
//     twitter: {
//       card: 'summary_large_image',
//       title: \`\${tag.name} ${Name}\`,
//       description: \`Browse all \${tag.name} tagged ${Name.toLowerCase()}\`,
//       images: [siteConfig.ogImage],
//     },
//   };
// }

// export default async function ${Name}TagPage({ params }: ${Name}TagPageProps) {
//   const { slug } = await params;
//   const tag = ${name}Tags[slug];

//   if (!tag) {
//     notFound();
//   }

//   const items = await get${Name}ByTagSlug(slug);

//   const breadcrumbItems = [
//     {
//       link: '/page/${name}/1',
//       label: '${Name}',
//     },
//     {
//       link: '',
//       label: tag.name,
//     },
//   ];

//   return (
//     <div className="flex flex-1 flex-col">
//       <div className="container-wrapper">
//         <div className="container">
//           <div className="hidden py-4 lg:block">
//             <Breadcrumb items={breadcrumbItems} />
//           </div>
//         </div>
//       </div>
//       <div className="container-wrapper">
//         <div className="container py-6">
//           <AboutCta />
//         </div>
//         <div className="container pb-6">
//           <CardTagTitle
//             icon={tag.icon}
//             name={tag.name}
//             postCount={items?.length}
//             itemName="${Name.toLowerCase()}"
//           />
//         </div>
//       </div>
//       <div className="container-wrapper">
//         <div className="container flex flex-col gap-1">
//           <section className="container border-b py-6">
//             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
//               {items?.map((item) => (
//                 <LinkCard
//                   key={item.slug}
//                   title={item.metadata.title}
//                   imageUrl={item.metadata.thumbnail || '/og.webp'}
//                   link={\`/${name}/\${item.slug}\`}
//                   badgeText={item.metadata.createdAt ? formatDate(item.metadata.createdAt) : undefined}
//                   description={item.metadata.description}
//                   priority={true}
//                 />
//               ))}
//             </div>
//           </section>
//         </div>
//       </div>
//     </div>
//   );
// }

// function CardTagTitle({
//   icon,
//   name,
//   postCount,
//   itemName,
// }: {
//   icon: keyof typeof BrandIcons;
//   name: string;
//   postCount?: number;
//   itemName: string;
// }) {
//   const TagIcon = BrandIcons[icon];

//   return (
//     <div className="pb-8">
//       <div className="from-primary/5 via-primary/3 ring-primary/10 relative overflow-hidden rounded-2xl bg-gradient-to-br to-transparent p-6 ring-1">
//         <div className="bg-primary/5 absolute -top-4 -right-4 h-24 w-24 rounded-full"></div>
//         <div className="relative flex items-start gap-4">
//           <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-xl">
//             <TagIcon className="h-6 w-6" />
//           </div>
//           <div className="flex-1">
//             <div className="mb-2 flex items-center gap-2">
//               <Badge variant="outline" className="text-xs">
//                 TAG
//               </Badge>
//               {postCount && (
//                 <span className="text-muted-foreground text-sm">
//                   • {postCount} {itemName}
//                 </span>
//               )}
//             </div>
//             <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
//             <TextAnimate
//               animation="blurIn"
//               as="p"
//               className="text-muted-foreground mt-1"
//             >
//               {\`Explore all \${itemName} tagged with \${name}\`}
//             </TextAnimate>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
// `,

//   // 7. 管理后台页面模板
//   adminPage: (name, Name) => `'use client';

// import { useCallback, useEffect, useState } from 'react';
// import Link from 'next/link';
// import { useRouter } from 'next/navigation';
// import Editor from '@monaco-editor/react';
// import { FileText, LogOut, Pencil, RefreshCw, Save, Trash2, Upload, X } from 'lucide-react';
// import { toast } from 'sonner';

// import {
//   AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
//   AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
// } from '@/components/shadcn-ui/alert-dialog';
// import { Badge } from '@/components/shadcn-ui/badge';
// import { Button } from '@/components/shadcn-ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn-ui/card';
// import {
//   Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
// } from '@/components/shadcn-ui/dialog';
// import { Input } from '@/components/shadcn-ui/input';
// import {
//   Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
// } from '@/components/shadcn-ui/table';

// interface ${Name}File {
//   slug: string;
//   fileName: string;
//   title: string;
//   description: string;
//   thumbnail: string;
//   tags: string[];
//   size: number;
//   updatedAt: string;
// }

// export default function ${Name}AdminPage() {
//   const router = useRouter();
//   const [files, setFiles] = useState<${Name}File[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedFile, setSelectedFile] = useState<${Name}File | null>(null);
//   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
//   const [isUploading, setIsUploading] = useState(false);
//   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
//   const [editContent, setEditContent] = useState('');
//   const [isSaving, setIsSaving] = useState(false);

//   const fetchFiles = useCallback(async () => {
//     try {
//       setLoading(true);
//       const response = await fetch('/api/${name}-files');
//       if (!response.ok) throw new Error('获取失败');
//       const data = await response.json();
//       setFiles(data);
//     } catch {
//       toast.error('获取文件列表失败');
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchFiles();
//   }, [fetchFiles]);

//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       if (!selectedFile) return;
//       if (e.ctrlKey && e.code === 'KeyS') {
//         e.preventDefault();
//         handleSave();
//       }
//     };
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [selectedFile, editContent]);

//   const handleLogout = async () => {
//     try { await fetch('/api/logout', { method: 'POST' }); } catch {}
//     router.push('/admin/login');
//     toast.success('已登出');
//   };

//   const handleEdit = async (file: ${Name}File) => {
//     try {
//       const response = await fetch(\`/api/${name}-files/\${file.slug}\`);
//       if (!response.ok) throw new Error('获取失败');
//       const data = await response.json();
//       setSelectedFile(file);
//       setEditContent(data.content);
//       setIsEditDialogOpen(true);
//     } catch {
//       toast.error('获取文件内容失败');
//     }
//   };

//   const handleSave = async () => {
//     if (!selectedFile) return;
//     setIsSaving(true);
//     try {
//       const response = await fetch(\`/api/${name}-files/\${selectedFile.slug}\`, {
//         method: 'PUT',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ content: editContent }),
//       });
//       if (!response.ok) throw new Error('保存失败');
//       toast.success('文件保存成功');
//       setIsEditDialogOpen(false);
//       fetchFiles();
//     } catch {
//       toast.error('保存失败');
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!selectedFile) return;
//     try {
//       const response = await fetch(\`/api/${name}-files/\${selectedFile.slug}\`, {
//         method: 'DELETE',
//       });
//       if (!response.ok) throw new Error('删除失败');
//       toast.success('文件删除成功');
//       setIsDeleteDialogOpen(false);
//       setSelectedFile(null);
//       fetchFiles();
//     } catch {
//       toast.error('删除失败');
//     }
//   };

//   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     const isYaml = file.name.endsWith('.yml') || file.name.endsWith('.yaml');
//     if (!isYaml) {
//       toast.error('只支持 .yml 或 .yaml 文件');
//       return;
//     }
//     setIsUploading(true);
//     try {
//       const formData = new FormData();
//       formData.append('file', file);
//       const response = await fetch('/api/${name}-files', {
//         method: 'POST',
//         body: formData,
//       });
//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || '上传失败');
//       }
//       toast.success('文件上传成功');
//       fetchFiles();
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : '上传失败');
//     } finally {
//       setIsUploading(false);
//       e.target.value = '';
//     }
//   };

//   const formatSize = (bytes: number) => {
//     if (bytes < 1024) return bytes + ' B';
//     if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
//     return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
//   };

//   const truncate = (text: string, maxLen: number) => {
//     if (!text) return '-';
//     return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
//   };

//   return (
//     <div className="bg-muted/30 min-h-screen">
//       <header className="bg-background border-b px-6 py-4">
//         <div className="mx-auto flex max-w-6xl items-center justify-between">
//           <div className="flex items-center gap-4">
//             <h1 className="text-xl font-bold">${Name} 管理</h1>
//             <Link href="/admin/blog" className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm">
//               <FileText className="h-4 w-4" />
//               切换到 Blog
//             </Link>
//           </div>
//           <div className="flex items-center gap-4">
//             <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loading}>
//               <RefreshCw className={\`mr-2 h-4 w-4 \${loading ? 'animate-spin' : ''}\`} />
//               刷新
//             </Button>
//             <Button variant="ghost" size="sm" onClick={handleLogout}>
//               <LogOut className="mr-2 h-4 w-4" />
//               登出
//             </Button>
//           </div>
//         </div>
//       </header>

//       <main className="mx-auto max-w-6xl p-6">
//         <Card>
//           <CardHeader className="flex flex-row items-center justify-between">
//             <CardTitle>文件列表 ({files.length})</CardTitle>
//             <div className="flex items-center gap-2">
//               <Input type="file" accept=".yml,.yaml" onChange={handleUpload} disabled={isUploading}
//                 className="hidden" id="yaml-upload" />
//               <Button asChild disabled={isUploading}>
//                 <label htmlFor="yaml-upload" className="cursor-pointer">
//                   <Upload className="mr-2 h-4 w-4" />
//                   {isUploading ? '上传中...' : '上传 YAML'}
//                 </label>
//               </Button>
//             </div>
//           </CardHeader>
//           <CardContent>
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>标题</TableHead>
//                   <TableHead>文件名</TableHead>
//                   <TableHead>图片路径</TableHead>
//                   <TableHead>标签</TableHead>
//                   <TableHead>大小</TableHead>
//                   <TableHead className="text-right">操作</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {files.length === 0 ? (
//                   <TableRow>
//                     <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
//                       {loading ? '加载中...' : '暂无文件'}
//                     </TableCell>
//                   </TableRow>
//                 ) : (
//                   files.map((file) => (
//                     <TableRow key={file.slug}>
//                       <TableCell className="cursor-pointer font-medium underline-offset-4 hover:underline">
//                         <Link href={\`/${name}/\${file.slug}\`}>{file.title}</Link>
//                       </TableCell>
//                       <TableCell className="text-muted-foreground">{file.fileName}</TableCell>
//                       <TableCell className="text-muted-foreground max-w-[200px] truncate" title={file.thumbnail}>{truncate(file.thumbnail, 30)}</TableCell>
//                       <TableCell>
//                         <div className="flex flex-wrap gap-1">
//                           {file.tags?.map((tag) => (
//                             <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
//                           )) || '-'}
//                         </div>
//                       </TableCell>
//                       <TableCell className="text-muted-foreground">{formatSize(file.size)}</TableCell>
//                       <TableCell className="text-right">
//                         <div className="flex justify-end gap-2">
//                           <Button variant="ghost" size="icon" onClick={() => handleEdit(file)}>
//                             <Pencil className="h-4 w-4" />
//                           </Button>
//                           <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
//                             onClick={() => { setSelectedFile(file); setIsDeleteDialogOpen(true); }}>
//                             <Trash2 className="h-4 w-4" />
//                           </Button>
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))
//                 )}
//               </TableBody>
//             </Table>
//           </CardContent>
//         </Card>

//         <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
//           <DialogContent className="max-h-[90vh]">
//             <DialogHeader>
//               <DialogTitle>编辑: {selectedFile?.title}</DialogTitle>
//               <DialogDescription>{selectedFile?.fileName}</DialogDescription>
//             </DialogHeader>
//             <div className="mt-4 h-[60vh] w-full">
//               <Editor height="100%" defaultLanguage="yaml" value={editContent}
//                 onChange={(value) => setEditContent(value || '')}
//                 options={{ minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: 'on',
//                   lineNumbers: 'on', folding: true, automaticLayout: true, tabSize: 2, fontSize: 14 }}
//                 theme="vs-dark" />
//             </div>
//             <DialogFooter className="mt-4">
//               <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>
//                 <X className="mr-2 h-4 w-4" />
//                 取消
//               </Button>
//               <Button onClick={handleSave} disabled={isSaving}>
//                 <Save className="mr-2 h-4 w-4" />
//                 {isSaving ? '保存中...' : '保存'}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>

//         <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
//           <AlertDialogContent>
//             <AlertDialogHeader>
//               <AlertDialogTitle>确认删除?</AlertDialogTitle>
//               <AlertDialogDescription>
//                 确定要删除 &quot;{selectedFile?.title}&quot; 吗？此操作无法撤销。
//               </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//               <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>取消</AlertDialogCancel>
//               <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white">删除</AlertDialogAction>
//             </AlertDialogFooter>
//           </AlertDialogContent>
//         </AlertDialog>
//       </main>
//     </div>
//   );
// }
// `,

//   // 8. 示例 YAML 文件模板
//   sampleYaml: (fields) => `---
// ${fields.map((f) => `${f.name}: ${f.example}`).join('\n')}
// ---
// `,
// };

// function formatDate(input) {
//   const date = new Date(input);
//   return date.toLocaleDateString('zh-CN', {
//     timeZone: 'Asia/Shanghai',
//     year: 'numeric',
//     month: 'numeric',
//     day: 'numeric',
//   });
// }

// // 解析字段定义
// function parseFields(fieldDefs, moduleName) {
//   if (!fieldDefs || fieldDefs.length === 0) {
//     return [
//       { name: 'title', type: 'string', example: 'Sample Title' },
//       {
//         name: 'description',
//         type: 'string',
//         example: 'Sample description text',
//       },
//       {
//         name: 'thumbnail',
//         type: 'string',
//         example: '/images/' + moduleName + '/image-01.webp',
//       },
//       { name: 'tags', type: 'string[]', example: '\n  - tag1\n  - tag2' },
//       { name: 'createdAt', type: 'string', example: formatDate(new Date()) },
//     ];
//   }

//   return fieldDefs.map((def) => {
//     const [name, type = 'string', example] = def.split(':');
//     return {
//       name,
//       type,
//       example: example || getDefaultExample(type, name, moduleName),
//     };
//   });
// }

// function getDefaultExample(type, name, moduleName) {
//   if (name.includes('thumbnail') || name.includes('image'))
//     return '/images/' + moduleName + '/image-01.webp';
//   if (name === 'title') return 'Sample Title';
//   if (name === 'description') return 'Sample description text';
//   if (type === 'string[]') return '\n  - tag1\n  - tag2';
//   if (type === 'number') return '42';
//   if (type === 'boolean') return 'true';
//   if (type === 'string' && name === 'createdAt')
//     return new Date().toISOString();
//   return 'sample';
// }

// // 创建目录
// async function mkdirp(dir) {
//   await fs.mkdir(dir, { recursive: true });
// }

// // 写入文件（如果不存在）
// async function writeFileIfNotExists(filePath, content) {
//   try {
//     await fs.access(filePath);
//     console.log(`⚠️ 已存在: ${path.relative(PROJECT_ROOT, filePath)}`);
//     return false;
//   } catch {
//     await fs.writeFile(filePath, content, 'utf-8');
//     console.log(`✅ 创建: ${path.relative(PROJECT_ROOT, filePath)}`);
//     return true;
//   }
// }

// // 主函数
// async function main() {
//   const args = process.argv.slice(2);

//   if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
//     console.log(`
// 用法: node scripts/create-module.mjs <模块名> [字段定义...]

// 参数:
//   <模块名>        模块名称，如: video, podcast, document
//   [字段定义...]   可选，定义数据字段，格式: 字段名:类型:示例

// 示例:
//   node scripts/create-module.mjs video
//   node scripts/create-module.mjs video title:string:Sample description:string duration:number:120

// 生成的文件:
//   - src/lib/<module>.ts                 # 数据层
//   - src/app/api/<module>-files/route.ts # API 列表接口
//   - src/app/api/<module>-files/[slug]/route.ts # API 详情接口
//   - src/app/(app)/page/<module>/[page]/page.tsx # 分页列表页
//   - src/app/(app)/<module>/[slug]/page.tsx      # 详情页
//   - src/app/(app)/tag/<module>/[slug]/page.tsx  # Tag 页
//   - src/app/admin/<module>/page.tsx    # 管理后台
//   - src/components/content/<module>-card.tsx     # 卡片组件
//   - src/content/<module>/                # 内容目录
//   - src/content/<module>/sample-01.yml  # 示例文件
//     `);
//     process.exit(0);
//   }

//   const moduleName = args[0].toLowerCase();
//   const ModuleName = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
//   const fields = parseFields(args.slice(1), moduleName);

//   console.log(`\n🚀 创建模块: ${ModuleName}`);
//   console.log(`📋 字段定义:`);
//   fields.forEach((f) => console.log(`   - ${f.name}: ${f.type}`));
//   console.log();

//   const created = [];
//   const skipped = [];

//   // 1. 创建数据层
//   const libPath = path.join(PROJECT_ROOT, 'src', 'lib', `${moduleName}.ts`);
//   await mkdirp(path.dirname(libPath));
//   if (
//     await writeFileIfNotExists(
//       libPath,
//       TEMPLATES.lib(moduleName, ModuleName, fields)
//     )
//   ) {
//     created.push(`src/lib/${moduleName}.ts`);
//   } else {
//     skipped.push(`src/lib/${moduleName}.ts`);
//   }

//   // 2. 创建 API 路由
//   const apiDir = path.join(
//     PROJECT_ROOT,
//     'src',
//     'app',
//     'api',
//     `${moduleName}-files`
//   );
//   await mkdirp(apiDir);
//   if (
//     await writeFileIfNotExists(
//       path.join(apiDir, 'route.ts'),
//       TEMPLATES.apiList(moduleName, ModuleName)
//     )
//   ) {
//     created.push(`src/app/api/${moduleName}-files/route.ts`);
//   } else {
//     skipped.push(`src/app/api/${moduleName}-files/route.ts`);
//   }

//   const apiSlugDir = path.join(apiDir, '[slug]');
//   await mkdirp(apiSlugDir);
//   if (
//     await writeFileIfNotExists(
//       path.join(apiSlugDir, 'route.ts'),
//       TEMPLATES.apiDetail(moduleName, ModuleName)
//     )
//   ) {
//     created.push(`src/app/api/${moduleName}-files/[slug]/route.ts`);
//   } else {
//     skipped.push(`src/app/api/${moduleName}-files/[slug]/route.ts`);
//   }

//   // 3. 创建页面
//   const pageDir = path.join(
//     PROJECT_ROOT,
//     'src',
//     'app',
//     '(app)',
//     'page',
//     moduleName,
//     '[page]'
//   );
//   await mkdirp(pageDir);
//   if (
//     await writeFileIfNotExists(
//       path.join(pageDir, 'page.tsx'),
//       TEMPLATES.listPage(moduleName, ModuleName)
//     )
//   ) {
//     created.push(`src/app/(app)/page/${moduleName}/[page]/page.tsx`);
//   } else {
//     skipped.push(`src/app/(app)/page/${moduleName}/[page]/page.tsx`);
//   }

//   const detailDir = path.join(
//     PROJECT_ROOT,
//     'src',
//     'app',
//     '(app)',
//     moduleName,
//     '[slug]'
//   );
//   await mkdirp(detailDir);
//   if (
//     await writeFileIfNotExists(
//       path.join(detailDir, 'page.tsx'),
//       TEMPLATES.detailPage(moduleName, ModuleName, fields)
//     )
//   ) {
//     created.push(`src/app/(app)/${moduleName}/[slug]/page.tsx`);
//   } else {
//     skipped.push(`src/app/(app)/${moduleName}/[slug]/page.tsx`);
//   }

//   const tagDir = path.join(
//     PROJECT_ROOT,
//     'src',
//     'app',
//     '(app)',
//     'tag',
//     moduleName,
//     '[slug]'
//   );
//   await mkdirp(tagDir);
//   if (
//     await writeFileIfNotExists(
//       path.join(tagDir, 'page.tsx'),
//       TEMPLATES.tagPage(moduleName, ModuleName)
//     )
//   ) {
//     created.push(`src/app/(app)/tag/${moduleName}/[slug]/page.tsx`);
//   } else {
//     skipped.push(`src/app/(app)/tag/${moduleName}/[slug]/page.tsx`);
//   }

//   // 4. 创建管理后台
//   const adminDir = path.join(PROJECT_ROOT, 'src', 'app', 'admin', moduleName);
//   await mkdirp(adminDir);
//   if (
//     await writeFileIfNotExists(
//       path.join(adminDir, 'page.tsx'),
//       TEMPLATES.adminPage(moduleName, ModuleName)
//     )
//   ) {
//     created.push(`src/app/admin/${moduleName}/page.tsx`);
//   } else {
//     skipped.push(`src/app/admin/${moduleName}/page.tsx`);
//   }

//   // 5. 创建内容目录和示例文件
//   const contentDir = path.join(PROJECT_ROOT, 'src', 'content', moduleName);
//   await mkdirp(contentDir);
//   if (
//     await writeFileIfNotExists(
//       path.join(contentDir, 'sample-01.yml'),
//       TEMPLATES.sampleYaml(fields)
//     )
//   ) {
//     created.push(`src/content/${moduleName}/sample-01.yml`);
//   } else {
//     skipped.push(`src/content/${moduleName}/sample-01.yml`);
//   }

//   // 7. 添加到 admin 入口页面
//   const adminEntryPath = path.join(
//     PROJECT_ROOT,
//     'src',
//     'app',
//     'admin',
//     'page.tsx'
//   );
//   try {
//     const adminContent = await fs.readFile(adminEntryPath, 'utf-8');
//     const newCard = `          {/* ${ModuleName} 管理卡片 */}
//           <Link href="/admin/${moduleName}">
//             <Card className="cursor-pointer transition-shadow hover:shadow-lg">
//               <CardHeader>
//                 <div className="flex items-center gap-3">
//                   <div className="bg-primary text-primary-foreground flex h-12 w-12 items-center justify-center rounded-lg">
//                     <Folder className="h-6 w-6" />
//                   </div>
//                   <div>
//                     <CardTitle>${ModuleName} 管理</CardTitle>
//                     <CardDescription>管理${ModuleName}数据</CardDescription>
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <p className="text-muted-foreground text-sm">
//                   上传、编辑、删除${ModuleName}内容，支持 YAML 格式配置。
//                 </p>
//               </CardContent>
//             </Card>
//           </Link>`;

//     if (!adminContent.includes(`/admin/${moduleName}`)) {
//       // 在最后一个 </Link> 后添加新卡片
//       const updatedContent = adminContent.replace(
//         /(<\/Card>\s*<\/Link>)(\s*<\/div>\s*<\/main>)/,
//         `$1\n${newCard}$2`
//       );
//       // 添加 Folder 图标导入
//       const withImport = updatedContent.includes('Folder')
//         ? updatedContent
//         : updatedContent.replace(
//             "import { FileText, ImageIcon, LogOut } from 'lucide-react';",
//             "import { FileText, Folder, ImageIcon, LogOut } from 'lucide-react';"
//           );
//       await fs.writeFile(adminEntryPath, withImport, 'utf-8');
//       console.log(`✅ 更新: src/app/admin/page.tsx (添加 ${ModuleName} 入口)`);
//     } else {
//       console.log(
//         `⚠️ 跳过: src/app/admin/page.tsx (已存在 ${ModuleName} 入口)`
//       );
//     }
//   } catch (error) {
//     console.error(`❌ 更新 admin/page.tsx 失败:`, error.message);
//   }

//   // 8. 更新 src/lib/config.ts 的 pageRoutesConfig
//   const libConfigPath = path.join(PROJECT_ROOT, 'src', 'lib', 'config.ts');
//   try {
//     const libConfigContent = await fs.readFile(libConfigPath, 'utf-8');
//     if (
//       !libConfigContent.includes(`name: '${ModuleName}'`) &&
//       !libConfigContent.includes(`name: '${moduleName}'`)
//     ) {
//       const newPageRouteItem = `  {
//     name: '${ModuleName}',
//     navHref: '/page/${moduleName}/1',
//     adminHref: '/admin/${moduleName}',
//     label: '${ModuleName} 管理',
//     title: '管理${ModuleName}数据和内容',
//     description: '上传、编辑、删除${ModuleName}内容，支持 YAML 格式配置。',
//   },`;
//       const updatedContent = libConfigContent.replace(
//         /(export const pageRoutesConfig = \[)([\s\S]*?)(\];)/,
//         `$1$2${newPageRouteItem}\n$3`
//       );
//       await fs.writeFile(libConfigPath, updatedContent, 'utf-8');
//       console.log(`✅ 更新: src/lib/config.ts (添加 ${ModuleName} 导航)`);
//     } else {
//       console.log(`⚠️ 跳过: src/lib/config.ts (已存在 ${ModuleName} 导航)`);
//     }
//   } catch (error) {
//     console.error(`❌ 更新 src/lib/config.ts 失败:`, error.message);
//   }

//   // 更新 src/app/admin/config.ts
//   const adminConfigPath = path.join(
//     PROJECT_ROOT,
//     'src',
//     'app',
//     'admin',
//     'config.ts'
//   );
//   try {
//     const adminConfigContent = await fs.readFile(adminConfigPath, 'utf-8');
//     if (
//       !adminConfigContent.includes(`name: '${ModuleName}'`) &&
//       !adminConfigContent.includes(`name: '${moduleName}'`)
//     ) {
//       const newAdminNavItem = `  {
//     name: '${ModuleName}',
//     href: '/admin/${moduleName}',
//     label: '${ModuleName} 管理',
//     title: '管理${ModuleName}数据和内容',
//     description: '上传、编辑、删除${ModuleName}内容，支持 YAML 格式配置。',
//   },`;
//       const updatedContent = adminConfigContent.replace(
//         /(export const pageRoutesConfig = \[)([\s\S]*?)(\];)/,
//         `$1$2${newAdminNavItem}\n$3`
//       );
//       await fs.writeFile(adminConfigPath, updatedContent, 'utf-8');
//       console.log(
//         `✅ 更新: src/app/admin/config.ts (添加 ${ModuleName} 管理导航)`
//       );
//     } else {
//       console.log(
//         `⚠️ 跳过: src/app/admin/config.ts (已存在 ${ModuleName} 管理导航)`
//       );
//     }
//   } catch (error) {
//     console.error(`❌ 更新 src/app/admin/config.ts 失败:`, error.message);
//   }
//   // 9.更新src/lib/tag.ts，追加${moduleName}Tags定义
//   const tagPath = path.join(PROJECT_ROOT, 'src', 'lib', 'tag.ts');
//   try {
//     const tagContent = await fs.readFile(tagPath, 'utf-8');
//     if (
//       !tagContent.includes(`${moduleName}Tags`) &&
//       !tagContent.includes(`${ModuleName}Tags`)
//     ) {
//       const newTagItem = `export const ${moduleName}Tags: Record<string, Tag> = {
//   tag1: { name: 'Tag 1', icon: 'gitHub' },
//   tag2: { name: 'Tag 2', icon: 'gitHub' },
// };`;
//       const updatedContent = tagContent + `\n${newTagItem}\n`;
//       await fs.writeFile(tagPath, updatedContent, 'utf-8');
//       console.log(`✅ 更新: src/lib/tag.ts (添加 ${ModuleName} Tags 定义)`);
//     } else {
//       console.log(`⚠️ 跳过: src/lib/tag.ts (已存在 ${ModuleName} Tags 定义)`);
//     }
//   } catch (error) {
//     console.error(`❌ 更新 src/lib/tag.ts 失败:`, error.message);
//   }

//   // 总结
//   console.log('\n📊 生成结果:');
//   if (created.length > 0) {
//     console.log(`\n✅ 创建成功 (${created.length}):`);
//     created.forEach((f) => console.log(`   ${f}`));
//   }
//   if (skipped.length > 0) {
//     console.log(`\n⚠️ 已存在跳过 (${skipped.length}):`);
//     skipped.forEach((f) => console.log(`   ${f}`));
//   }

//   console.log(`\n📝 后续步骤:`);
//   console.log(`   1. 编辑 src/app/sitemap.ts 添加 ${moduleName} 路由`);
//   console.log(`   2. 检查 src/lib/tag.ts 和 src/lib/config.ts 的导航配置`);
//   console.log(`   3. 运行 npm run dev 启动开发服务器`);
//   console.log(`   4. 访问 http://localhost:8888/page/${moduleName}/1 查看效果`);
// }

// main().catch((error) => {
//   console.error('❌ 错误:', error);
//   process.exit(1);
// });
