import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchComboboxProps<T> {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: T[];
  getKey: (item: T) => string;
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  placeholder?: string;
  emptyMessage?: React.ReactNode;
  inputClassName?: string;
  required?: boolean;
}

/**
 * Search input + results dropdown rendered through a Radix Popover portal,
 * so the list is never clipped by a scrollable ancestor (e.g. a multi-item
 * form list with `overflow-y-auto`) the way a plain `absolute` dropdown is.
 */
export function SearchCombobox<T>({
  value, onValueChange, open, onOpenChange, items, getKey, onSelect, renderItem,
  placeholder, emptyMessage, inputClassName, required,
}: SearchComboboxProps<T>) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={value}
            onChange={e => { onValueChange(e.target.value); onOpenChange(true); }}
            onFocus={() => onOpenChange(true)}
            placeholder={placeholder}
            required={required}
            className={cn('pl-9', inputClassName)}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={e => e.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-60 overflow-y-auto"
      >
        {items.length === 0 ? (
          <div className="px-3 py-2.5 text-sm text-muted-foreground">{emptyMessage ?? 'Nenhum resultado encontrado'}</div>
        ) : (
          items.map(item => (
            <button
              key={getKey(item)}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => onSelect(item)}
              className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm border-b border-border/30 last:border-0"
            >
              {renderItem(item)}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
