import { getAllGalleryImages } from '@/lib/gallery';
import { getAllBlogPosts } from '@/lib/mdx';

export type SearchResult = {
  type: 'blog' | 'gallery';
  title: string;
  description: string;
  slug: string;
  thumbnail?: string;
  tags?: string[];
  lastUpdated: string;
  matchScore: number;
};

/**
 * 计算模糊匹配分数
 * @param text 被搜索文本
 * @param keyword 关键词
 * @returns 匹配分数 (0-1)
 */
function calculateMatchScore(text: string, keyword: string): number {
  const normalizedText = text.toLowerCase().trim();
  const normalizedKeyword = keyword.toLowerCase().trim();

  if (!normalizedKeyword) return 0;
  if (normalizedText === normalizedKeyword) return 1;
  if (normalizedText.startsWith(normalizedKeyword)) return 0.9;
  if (normalizedText.includes(normalizedKeyword)) return 0.7;

  // 简单的模糊匹配：计算字符出现顺序
  let keywordIndex = 0;
  for (
    let i = 0;
    i < normalizedText.length && keywordIndex < normalizedKeyword.length;
    i++
  ) {
    if (normalizedText[i] === normalizedKeyword[keywordIndex]) {
      keywordIndex++;
    }
  }

  if (keywordIndex === normalizedKeyword.length) {
    return 0.5 * (normalizedKeyword.length / normalizedText.length);
  }

  return 0;
}

/**
 * 搜索博客文章
 * @param keyword 搜索关键词
 * @returns 搜索结果
 */
async function searchBlogPosts(keyword: string): Promise<SearchResult[]> {
  const posts = await getAllBlogPosts();
  const results: SearchResult[] = [];

  for (const post of posts) {
    let maxScore = 0;

    // 标题匹配权重最高
    const titleScore = calculateMatchScore(post.metadata.title, keyword) * 3;
    maxScore = Math.max(maxScore, titleScore);

    // 描述匹配
    const descScore =
      calculateMatchScore(post.metadata.description, keyword) * 2;
    maxScore = Math.max(maxScore, descScore);

    // 内容匹配
    const contentScore = calculateMatchScore(post.rawContent, keyword);
    maxScore = Math.max(maxScore, contentScore);

    // 标签匹配
    if (post.metadata.tags) {
      for (const tag of post.metadata.tags) {
        const tagScore = calculateMatchScore(tag, keyword) * 2.5;
        maxScore = Math.max(maxScore, tagScore);
      }
    }

    if (maxScore > 0) {
      results.push({
        type: 'blog',
        title: post.metadata.title,
        description: post.metadata.description,
        slug: `/blog/${post.slug}`,
        thumbnail: post.metadata.thumbnail,
        tags: post.metadata.tags,
        lastUpdated: post.metadata.lastUpdated,
        matchScore: maxScore,
      });
    }
  }

  return results;
}

/**
 * 搜索画廊项目
 * @param keyword 搜索关键词
 * @returns 搜索结果
 */
async function searchGalleryItems(keyword: string): Promise<SearchResult[]> {
  const items = await getAllGalleryImages();
  const results: SearchResult[] = [];

  for (const item of items) {
    let maxScore = 0;

    // 标题匹配权重最高
    const titleScore = calculateMatchScore(item.metadata.title, keyword) * 3;
    maxScore = Math.max(maxScore, titleScore);

    // 描述匹配
    const descScore =
      calculateMatchScore(item.metadata.description, keyword) * 2;
    maxScore = Math.max(maxScore, descScore);

    // 画廊项目没有 rawContent，跳过内容匹配

    // 标签匹配
    if (item.metadata.tags) {
      for (const tag of item.metadata.tags) {
        const tagScore = calculateMatchScore(tag, keyword) * 2.5;
        maxScore = Math.max(maxScore, tagScore);
      }
    }

    if (maxScore > 0) {
      results.push({
        type: 'gallery',
        title: item.metadata.title,
        description: item.metadata.description,
        slug: `/gallery/${item.slug}`,
        thumbnail: item.metadata.thumbnail,
        tags: item.metadata.tags,
        lastUpdated: item.metadata.lastUpdated,
        matchScore: maxScore,
      });
    }
  }

  return results;
}

/**
 * 执行全局模糊搜索
 * @param keyword 搜索关键词
 * @param limit 返回结果数量限制
 * @returns 搜索结果数组，按匹配分数排序
 */
export async function performSearch(
  keyword: string,
  limit = 10
): Promise<SearchResult[]> {
  if (!keyword.trim()) {
    return [];
  }

  const [blogResults, galleryResults] = await Promise.all([
    searchBlogPosts(keyword),
    searchGalleryItems(keyword),
  ]);

  // 合并并按匹配分数排序
  const allResults = [...blogResults, ...galleryResults].sort(
    (a, b) => b.matchScore - a.matchScore
  );

  return allResults.slice(0, limit);
}
