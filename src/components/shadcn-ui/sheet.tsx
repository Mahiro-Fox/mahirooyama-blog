'use client';

import * as React from 'react';
import { cn } from '@/utils/utils';

interface SheetProps {
  open?: boolean;
  children: React.ReactNode;
}

function Sheet({ open, children }: SheetProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 transition-all duration-300 md:hidden',
        open ? 'z-50 translate-x-0' : 'z-[-1] -translate-x-full'
      )}
    >
      <div className="inset-y-0 left-0 h-full">{children}</div>
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

interface SheetHeaderProps extends React.ComponentProps<'div'> {
  children: React.ReactNode;
}

function SheetHeader({ className, children, ...props }: SheetHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props}>
      {children}
    </div>
  );
}

interface SheetTitleProps extends React.ComponentProps<'h2'> {
  children: React.ReactNode;
}

function SheetTitle({ className, children, ...props }: SheetTitleProps) {
  return (
    <h2 className={cn('text-lg font-semibold', className)} {...props}>
      {children}
    </h2>
  );
}

interface SheetCloseProps extends React.ComponentProps<'button'> {
  children: React.ReactNode;
  asChild?: boolean;
}

function SheetClose({ children, asChild, ...props }: SheetCloseProps) {
  const { onOpenChange } = React.useContext(SheetContext);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: () => onOpenChange?.(false),
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button type="button" onClick={() => onOpenChange?.(false)} {...props}>
      {children}
    </button>
  );
}

// Context for sharing onOpenChange
const SheetContext = React.createContext<{
  onOpenChange?: (open: boolean) => void;
}>({});

// Wrap Sheet with Provider
function SheetProvider({ open, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{}}>
      <Sheet open={open}>{children}</Sheet>
    </SheetContext.Provider>
  );
}

export {
  SheetProvider as Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
};
