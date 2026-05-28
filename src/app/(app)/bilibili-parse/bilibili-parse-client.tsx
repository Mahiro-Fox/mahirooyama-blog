'use client';

import { useEffect, useState } from 'react';
import { formatSize } from '@/utils/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Copy, Download, History, Trash2, Video } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/shadcn-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';
import { Input } from '@/components/shadcn-ui/input';

interface ParseResult {
  title: string;
  cover: string;
  mp4Url: string;
  duration: number;
  fileSize: number;
  quality: number;
  format: string;
  acceptDescription: string[];
  supportFormats: Array<{
    quality: number;
    format: string;
    description: string;
    displayDesc: string;
  }>;
}

interface HistoryItem extends ParseResult {
  id: string;
  url: string;
  timestamp: number;
}

export default function BilibiliParsePage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('bilibili-parse-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('bilibili-parse-history', JSON.stringify(history));
  }, [history]);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    if (hours > 0) {
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/bilibili-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '解析失败');
        return;
      }

      setResult(data);

      // Add to history
      const historyItem: HistoryItem = {
        ...data,
        id: Date.now().toString(),
        url,
        timestamp: Date.now(),
      };

      // Check if item already exists
      const isExists = history.some((item) => item.url === historyItem.url);
      if (isExists) return;

      setHistory((prev) => {
        const newHistory = [historyItem, ...prev];
        // Keep only last 50 items
        if (newHistory.length > 50) {
          return newHistory.slice(0, 50);
        }
        return newHistory;
      });
      toast.success('解析成功');
    } catch (err) {
      setError('网络错误，请稍后重试');
      toast.error('解析失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleLoadFromHistory = (item: HistoryItem) => {
    setUrl(item.url);
    setResult(item);
    // setShowHistory(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with History Toggle */}
      <div className="flex items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1"
        >
          <form onSubmit={handleParse} className="flex gap-2">
            <Input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="请输入 B 站视频链接，例如：https://www.bilibili.com/video/BV1xxx/"
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !url} size="default">
              {loading ? (
                <>
                  <motion.div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  解析中...
                </>
              ) : (
                '解析'
              )}
            </Button>
          </form>
        </motion.div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowHistory(!showHistory)}
          className="relative w-24"
        >
          <History className="h-4 w-4" />
          <span>历史记录</span>
          {history.length > 0 && (
            <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
              {history.length}
            </span>
          )}
        </Button>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="p-4">
                <p className="text-destructive text-sm">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    解析历史
                  </CardTitle>
                  {history.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearHistory}
                      className="text-destructive hover:text-destructive"
                    >
                      清空
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {history.length === 0
                    ? '暂无解析记录'
                    : `共 ${history.length} 条记录`}
                </CardDescription>
              </CardHeader>
              {history.length > 0 && (
                <CardContent className="space-y-2">
                  {history.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleLoadFromHistory(item)}
                    >
                      <div className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3">
                        <img
                          src={item.cover}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.title}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDuration(item.duration)} · {item.format}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleLoadFromHistory(item)}
                          >
                            <Video className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDeleteHistory(item.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Card */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  解析结果
                </CardTitle>
                <CardDescription>视频信息已成功解析</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Video Title */}
                <div>
                  <label className="text-muted-foreground mb-2 block text-sm font-medium">
                    视频标题
                  </label>
                  <p className="text-base font-medium">{result.title}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-card rounded-lg border p-4"
                  >
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      视频时长
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      {formatDuration(result.duration)}
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-card rounded-lg border p-4"
                  >
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <Download className="h-4 w-4" />
                      文件大小
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      {formatSize(result.fileSize)}
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-card rounded-lg border p-4"
                  >
                    <div className="text-muted-foreground text-sm">
                      当前画质
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      {result.format}
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-card rounded-lg border p-4"
                  >
                    <div className="text-muted-foreground text-sm">
                      质量等级
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      {result.quality}
                    </p>
                  </motion.div>
                </div>

                {/* Cover Image */}
                <div>
                  <label className="text-muted-foreground mb-2 block text-sm font-medium">
                    封面图
                  </label>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <img
                      src={result.cover}
                      alt={result.title}
                      referrerPolicy="no-referrer"
                      className="max-h-64 w-auto rounded-lg border shadow-md"
                    />
                  </motion.div>
                </div>

                {/* Supported Formats */}
                <div>
                  <label className="text-muted-foreground mb-2 block text-sm font-medium">
                    支持的画质
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {result.supportFormats.map((fmt) => (
                      <motion.span
                        key={fmt.quality}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-secondary hover:bg-secondary/80 rounded-full border px-3 py-1 text-sm transition-colors"
                      >
                        {fmt.displayDesc}
                      </motion.span>
                    ))}
                  </div>
                </div>

                {/* MP4 URL */}
                <div>
                  <label className="text-muted-foreground mb-2 block text-sm font-medium">
                    MP4 直链
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={result.mp4Url}
                      readOnly
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(result.mp4Url);
                        toast.success('已复制到剪贴板');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <a href={result.mp4Url} download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Video Preview */}
                <div>
                  <label className="text-muted-foreground mb-2 block text-sm font-medium">
                    视频预览
                  </label>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <video
                      src={result.mp4Url}
                      controls
                      className="w-full rounded-lg border shadow-md"
                    />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
