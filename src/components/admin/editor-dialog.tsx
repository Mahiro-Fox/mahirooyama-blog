'use client';

import Editor from '@monaco-editor/react';
import { Save, X } from 'lucide-react';
import { useState } from 'react';
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
import { Label } from '@/components/shadcn-ui/label';

interface EditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fileName?: string;
  fileNameLabel?: string;
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  isSaving?: boolean;
  saveButtonText?: string;
  language?: string;
  showFileName?: boolean;
  onFileNameChange?: (fileName: string) => void;
}

export function EditorDialog({
  open,
  onOpenChange,
  title,
  description,
  fileName,
  fileNameLabel = '文件名',
  content,
  onContentChange,
  onSave,
  isSaving = false,
  saveButtonText = '保存',
  language = 'markdown',
  showFileName = true,
  onFileNameChange,
}: EditorDialogProps) {
  const [localFileName, setLocalFileName] = useState(fileName || '');

  const handleFileNameChange = (value: string) => {
    setLocalFileName(value);
    onFileNameChange?.(value);
  };

  const handleSave = () => {
    if (showFileName && !localFileName.trim()) {
      return;
    }
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {showFileName && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="file-name">{fileNameLabel}</Label>
              <Input
                id="file-name"
                value={fileName || localFileName}
                onChange={(e) => handleFileNameChange(e.target.value)}
                placeholder="请输入文件名"
              />
            </div>
          )}

          <div className="min-h-[400px] flex-1 overflow-hidden rounded-md border">
            <Editor
              height="400px"
              language={language}
              value={content}
              onChange={(value) => onContentChange(value || '')}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
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
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            <X className="mr-2 h-4 w-4" />
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || (showFileName && !localFileName.trim())}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? '保存中...' : saveButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
