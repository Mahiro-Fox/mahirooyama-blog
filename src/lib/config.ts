export const siteConfig = {
  name: 'mahirooyama-blog',
  description:
    'mahirooyama-blog is a lightweight, minimalistic blog template built with Next.js (v15), MDX, Tailwind CSS (v4), and shadcn/ui',
  url: 'https://mahirooyama-blog-delta.vercel.app/',
  ogImage: 'https://mahirooyama-blog-delta.vercel.app/og.webp',
  links: {
    twitter: 'https://twitter.com/mahirooyama',
    github: 'https://github.com/Misterwanghaoyu/mahirooyama-blog',
  },
  copyRight: 'mahirooyama',
  email: 'mahirooyama@example.com',
};

export const pageRoutesConfig = [
  {
    name: 'Blog',
    navHref: '/page/blog/1',
    adminHref: '/admin/blog',
    label: 'Blog 管理',
    title: '管理博客文章和 MDX 文件',
    description:
      '上传、编辑、删除博客文章，支持 Markdown 格式和 YAML Frontmatter。',
  },
  {
    name: 'Gallery',
    navHref: '/page/gallery/1',
    adminHref: '/admin/gallery',
    label: 'Gallery 管理',
    title: '管理图库图片和元数据',
    description: '上传、编辑、删除图库图片，支持元数据管理。',
  },
];
