'use client';

import { forwardRef, useRef } from 'react';

import { Button } from '@/components/shadcn-ui/button';
import { Input } from '@/components/shadcn-ui/input';

interface FileUploadTriggerProps {
  id: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onFileSelect: (files: FileList) => void;
  children?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const FileUploadTrigger = forwardRef<
  HTMLButtonElement,
  FileUploadTriggerProps
>(
  (
    {
      id,
      accept,
      multiple = false,
      disabled = false,
      onFileSelect,
      children,
      variant = 'default',
      size = 'sm',
      className = '',
    },
    ref
  ) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files);
      }
      // 清空input值，允许重复选择相同文件
      e.target.value = '';
    };

    return (
      <>
        <Button
          type='button'
          ref={ref}
          variant={variant}
          size={size}
          onClick={handleClick}
          disabled={disabled}
          className={className}
        >
          {children}
        </Button>
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
          id={id}
        />
      </>
    );
  }
);

FileUploadTrigger.displayName = 'FileUploadTrigger';
