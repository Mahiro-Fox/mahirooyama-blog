import React from 'react';
import { useT } from '@/i18n/dictionary-provider';
import { Zap } from 'lucide-react';

import { Spinner } from '@/components/shadcn-ui/spinner';
import { UploadedFile } from '@/app/[lang]/(app)/image-compressor/_components/image-uploader';
import { ProcessedImageResult } from '@/app/[lang]/(app)/image-compressor/_components/process-status';

interface StartProcessButtonProps {
  uploadedFiles: UploadedFile[];
  isProcessing: boolean;
  progress: number;
  results: Array<ProcessedImageResult | null>;
  handleStartProcess: () => void;
}

const StartProcessButton: React.FC<StartProcessButtonProps> = (props) => {
  const { uploadedFiles, isProcessing, progress, results, handleStartProcess } =
    props;
  const t = useT();

  return (
    uploadedFiles.length > 0 && (
      <button
        onClick={handleStartProcess}
        disabled={isProcessing}
        className="flex items-center gap-2 rounded-xl bg-blue-500 px-6 py-3 font-medium text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:bg-blue-600 hover:shadow-blue-500/40 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isProcessing ? <Spinner /> : <Zap className="h-5 w-5" />}
        {isProcessing ? (
          <span>
            {t('image-compressor.processing_images')} {progress}%
          </span>
        ) : results.length > 0 ? (
          t('image-compressor.reconvert', { count: uploadedFiles.length })
        ) : (
          t('image-compressor.start_converting', {
            count: uploadedFiles.length,
          })
        )}
      </button>
    )
  );
};

export default StartProcessButton;
