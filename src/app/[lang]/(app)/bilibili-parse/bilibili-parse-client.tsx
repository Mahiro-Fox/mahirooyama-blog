'use client';

import { AnimatePresence, m } from 'framer-motion';
import { Clock, Copy, Download, History, Trash2, Video } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { Button } from '@/components/shadcn-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn-ui/card';
import { Input } from '@/components/shadcn-ui/input';
import { useT } from '@/i18n/dictionary-provider';
import { formatSize } from '@/utils/utils';

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

interface ParseFormProps {
  url: string;
  loading: boolean;
  historyCount: number;
  onUrlChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleHistory: () => void;
}

function ParseForm({
  url,
  loading,
  historyCount,
  onUrlChange,
  onSubmit,
  onToggleHistory,
}: ParseFormProps) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-4">
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1"
      >
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={t('bilibili-parse.enter_url_placeholder')}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !url} size="default">
            {loading ? (
              <>
                <m.div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t('bilibili-parse.parsing')}
              </>
            ) : (
              t('bilibili-parse.parse')
            )}
          </Button>
        </form>
      </m.div>

      <Button
        variant="outline"
        size="icon"
        onClick={onToggleHistory}
        className="relative w-24"
      >
        <History className="h-4 w-4" />
        <span>{t('bilibili-parse.history')}</span>
        {historyCount > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
            {historyCount}
          </span>
        )}
      </Button>
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  return (
    <AnimatePresence>
      {error && (
        <m.div
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
        </m.div>
      )}
    </AnimatePresence>
  );
}

interface HistoryPanelProps {
  showHistory: boolean;
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

function HistoryPanel({
  showHistory,
  history,
  onLoad,
  onDelete,
  onClear,
}: HistoryPanelProps) {
  const t = useT();
  return (
    <AnimatePresence>
      {showHistory && (
        <m.div
          initial={{ opacity: 0, gridTemplateRows: '0fr' }}
          animate={{ opacity: 1, gridTemplateRows: '1fr' }}
          exit={{ opacity: 0, gridTemplateRows: '0fr' }}
          transition={{ duration: 0.3 }}
          style={{ display: 'grid' }}
        >
          <Card className="min-h-0 overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('bilibili-parse.history')}
                </CardTitle>
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    className="text-destructive hover:text-destructive"
                  >
                    {t('bilibili-parse.clear')}
                  </Button>
                )}
              </div>
              <CardDescription>
                {history.length === 0
                  ? t('bilibili-parse.no_history')
                  : t('bilibili-parse.history_count', {
                      count: history.length,
                    })}
              </CardDescription>
            </CardHeader>
            {history.length > 0 && (
              <CardContent className="space-y-2">
                {history.map((item, index) => (
                  <m.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onLoad(item)}
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
                          onClick={() => onLoad(item)}
                        >
                          <Video className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => onDelete(item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </m.div>
                ))}
              </CardContent>
            )}
          </Card>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function ResultCard({ result }: { result: ParseResult | null }) {
  const t = useT();
  return (
    <AnimatePresence>
      {result && (
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                {t('bilibili-parse.parse_result')}
              </CardTitle>
              <CardDescription>
                {t('bilibili-parse.parse_success')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video Title */}
              <div>
                <span className="text-muted-foreground mb-2 block text-sm font-medium">
                  {t('bilibili-parse.video_title')}
                </span>
                <p className="text-base font-medium">{result.title}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <m.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-card rounded-lg border p-4"
                >
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    {t('bilibili-parse.video_duration')}
                  </div>
                  <p className="mt-1 text-lg font-semibold">
                    {formatDuration(result.duration)}
                  </p>
                </m.div>

                <m.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-card rounded-lg border p-4"
                >
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Download className="h-4 w-4" />
                    {t('bilibili-parse.file_size')}
                  </div>
                  <p className="mt-1 text-lg font-semibold">
                    {formatSize(result.fileSize)}
                  </p>
                </m.div>

                <m.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-card rounded-lg border p-4"
                >
                  <div className="text-muted-foreground text-sm">
                    {t('bilibili-parse.current_quality')}
                  </div>
                  <p className="mt-1 text-lg font-semibold">{result.format}</p>
                </m.div>

                <m.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-card rounded-lg border p-4"
                >
                  <div className="text-muted-foreground text-sm">
                    {t('bilibili-parse.quality_level')}
                  </div>
                  <p className="mt-1 text-lg font-semibold">{result.quality}</p>
                </m.div>
              </div>

              {/* Cover Image */}
              <div>
                <span className="text-muted-foreground mb-2 block text-sm font-medium">
                  {t('bilibili-parse.cover_image')}
                </span>
                <m.div
                  whileHover={{ scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <img
                    src={result.cover}
                    alt={result.title}
                    referrerPolicy="no-referrer"
                    className="max-h-64 w-auto rounded-lg border shadow-md"
                  />
                </m.div>
              </div>

              {/* Supported Formats */}
              <div>
                <span className="text-muted-foreground mb-2 block text-sm font-medium">
                  {t('bilibili-parse.supported_formats')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {result.supportFormats.map((fmt) => (
                    <m.span
                      key={fmt.quality}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-secondary hover:bg-secondary/80 rounded-full border px-3 py-1 text-sm transition-colors"
                    >
                      {fmt.displayDesc}
                    </m.span>
                  ))}
                </div>
              </div>

              {/* MP4 URL */}
              <div>
                <label
                  htmlFor="mp4-link"
                  className="text-muted-foreground mb-2 block text-sm font-medium"
                >
                  {t('bilibili-parse.mp4_link')}
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    id="mp4-link"
                    value={result.mp4Url}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(result.mp4Url);
                      toast.success(t('bilibili-parse.copy_to_clipboard'));
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a
                      href={result.mp4Url}
                      download
                      aria-label={t('bilibili-parse.download')}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Video Preview */}
              <div>
                <span className="text-muted-foreground mb-2 block text-sm font-medium">
                  {t('bilibili-parse.video_preview')}
                </span>
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <video
                    src={result.mp4Url}
                    controls
                    className="w-full rounded-lg border shadow-md"
                  />
                </m.div>
              </div>
            </CardContent>
          </Card>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default function BilibiliParsePage() {
  const t = useT();
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
        setError(data.error || t('bilibili-parse.parse_failed'));
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
      toast.success(t('bilibili-parse.parse_success'));
    } catch {
      setError(t('bilibili-parse.network_error'));
      toast.error(t('bilibili-parse.parse_failed'));
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
  };

  return (
    <div className="space-y-6">
      <ParseForm
        url={url}
        loading={loading}
        historyCount={history.length}
        onUrlChange={setUrl}
        onSubmit={handleParse}
        onToggleHistory={() => setShowHistory(!showHistory)}
      />
      <ErrorBanner error={error} />
      <HistoryPanel
        showHistory={showHistory}
        history={history}
        onLoad={handleLoadFromHistory}
        onDelete={handleDeleteHistory}
        onClear={handleClearHistory}
      />
      <ResultCard result={result} />
    </div>
  );
}
