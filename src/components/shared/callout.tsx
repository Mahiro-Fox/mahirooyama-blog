import {
  AlertTriangleIcon,
  FileTextIcon,
  InfoIcon,
  XCircleIcon,
} from 'lucide-react';
import { cn } from '@/utils/utils';

type CalloutType = 'info' | 'note' | 'warning' | 'danger';

interface CalloutProps {
  children?: React.ReactNode;
  type?: CalloutType;
  title?: string;
  className?: string;
}

const calloutStyles: Record<
  CalloutType,
  {
    icon: React.ElementType;
    title: string;
    containerClasses: string;
    iconClasses: string;
    titleClasses: string;
  }
> = {
  info: {
    icon: InfoIcon,
    title: 'Info',
    containerClasses: 'border-blue-300/60 bg-blue-50/40',
    iconClasses: 'text-blue-700',
    titleClasses: 'text-blue-900',
  },
  note: {
    icon: FileTextIcon,
    title: 'Note',
    containerClasses: 'border-[var(--border)] bg-surface/60',
    iconClasses: 'text-[var(--muted-foreground)]',
    titleClasses: 'text-foreground',
  },
  warning: {
    icon: AlertTriangleIcon,
    title: 'Warning',
    containerClasses: 'border-amber-300/60 bg-amber-50/40',
    iconClasses: 'text-amber-700',
    titleClasses: 'text-amber-900',
  },
  danger: {
    icon: XCircleIcon,
    title: 'Danger',
    containerClasses: 'border-red-300/60 bg-red-50/40',
    iconClasses: 'text-red-700',
    titleClasses: 'text-red-900',
  },
};

export function Callout({
  children,
  type = 'info',
  title,
  className,
  ...props
}: CalloutProps) {
  const {
    icon: Icon,
    title: defaultTitle,
    containerClasses,
    iconClasses,
    titleClasses,
  } = calloutStyles[type];

  const calloutTitle = title || defaultTitle;

  return (
    <div
      className={cn(
        'my-6 rounded-lg border p-4 shadow-sm',
        containerClasses,
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1 shrink-0">
          <Icon className={cn('size-5', iconClasses)} />
        </div>
        <div className="w-full min-w-0">
          <div className={cn('mb-1 font-medium', titleClasses)}>
            {calloutTitle}
          </div>
          <div className="text-foreground/90 [&>p]:my-0 [&>p:not(:first-child)]:mt-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
