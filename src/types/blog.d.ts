type Blog = {
  slug: string;
  title: string;
  description: string;
  thumbnail?: string;
  isPortrait: boolean;
  lastUpdated: string;
  tags?: string[];
  rawContent: string; // 原始内容
  renderContent: string; // 需要渲染的内容
};

type AdminBlog = Blog & {
  fileName: string;
  size: number;
};
