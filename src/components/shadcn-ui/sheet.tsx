'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="fixed inset-y-0 left-0 z-50 h-full">{children}</div>
    </div>
  );
}

interface SheetContentProps extends React.ComponentProps<'div'> {
  children: React.ReactNode;
  side?: 'left' | 'right';
}

function SheetContent({
  className,
  children,
  side = 'left',
  ...props
}: SheetContentProps) {
  return (
    <div
      className={cn(
        'bg-background h-full w-full border-r shadow-lg',
        side === 'left' && 'border-r',
        side === 'right' && 'border-l',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SheetTrigger({
  children,
  asChild,
  ...props
}: React.ComponentProps<'button'> & { asChild?: boolean }) {
  return (
    <button type="button" {...props}>
      {children}
    </button>
  );
}

export { Sheet, SheetContent, SheetTrigger };
