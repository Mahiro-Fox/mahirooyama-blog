'use client';

import * as React from 'react';
import { cn } from '@/utils/utils';
import { Check, ChevronDown } from 'lucide-react';

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType | undefined>(
  undefined
);

function useSelect() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('useSelect must be used within a Select provider');
  }
  return context;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function Select({ value, onValueChange, children, className }: SelectProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className={cn('relative', className)}>{children}</div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

function SelectTrigger({ children, className }: SelectTriggerProps) {
  const { open, setOpen } = useSelect();

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        'border-input bg-background ring-offset-background flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm shadow-sm transition-colors',
        'focus:ring-2 focus:ring-offset-2 focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
      <ChevronDown
        className={cn(
          'h-4 w-4 opacity-50 transition-transform',
          open && 'rotate-180'
        )}
      />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

function SelectValue({ placeholder, children }: SelectValueProps) {
  const { value } = useSelect();

  if (!value && placeholder) {
    return <span className="text-muted-foreground">{placeholder}</span>;
  }

  return <>{children || value}</>;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

function SelectContent({ children, className }: SelectContentProps) {
  const { open } = useSelect();

  if (!open) return null;

  return (
    <div
      className={cn(
        'bg-popover text-popover-foreground absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border p-1 shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

function SelectItem({
  value: itemValue,
  children,
  className,
}: SelectItemProps) {
  const { value, onValueChange, setOpen } = useSelect();
  const isSelected = value === itemValue;

  return (
    <button
      type="button"
      onClick={() => {
        onValueChange(itemValue);
        setOpen(false);
      }}
      className={cn(
        'relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground',
        isSelected && 'bg-accent',
        className
      )}
    >
      <span className="flex-1">{children}</span>
      {isSelected && <Check className="h-4 w-4" />}
    </button>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
