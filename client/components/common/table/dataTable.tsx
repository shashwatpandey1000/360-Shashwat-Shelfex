import React, { useState, ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import Loader from '../utility/loader';
import { Checkbox } from '@/components/ui/checkbox';

export type VisibilityBreakpoint = 'hidden' | 'sm' | 'md' | 'lg' | 'xl' | 'always';

export interface TableColumn<T> {
  heading: string;
  field: keyof T | string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => ReactNode;
  isSortable?: boolean;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  visibleFrom?: VisibilityBreakpoint;
}

export interface TableConfig<T> {
  uniqueKey: keyof T;
  columns: TableColumn<T>[];
  isSelectable?: boolean;
  onSelect?: (selectedRows: T[]) => void;
  rowActions?: (row: T) => ReactNode;
  rowClass?: string;
}

interface DataTableProps<T> {
  data: T[];
  config: TableConfig<T>;
  isLoading?: boolean;
  emptyMessage?: string;
}

const getNestedValue = (obj: any, path: string | number | symbol) => {
  if (typeof path !== 'string') return obj[path];
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const getVisibilityClass = (breakpoint?: VisibilityBreakpoint) => {
  if (!breakpoint || breakpoint === 'always') return 'flex';
  if (breakpoint === 'hidden') return 'hidden';
  return `hidden ${breakpoint}:flex`;
};

export function DataTable<T>({
  data,
  config,
  isLoading,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());
  const [sortState, setSortState] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(
    null,
  );

  const handleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
      config.onSelect?.([]);
    } else {
      const allIds = new Set(data.map((row) => row[config.uniqueKey]));
      setSelectedIds(allIds);
      config.onSelect?.(data);
    }
  };

  const handleSelectRow = (row: T) => {
    const id = row[config.uniqueKey];
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);

    const selectedRows = data.filter((r) => newSet.has(r[config.uniqueKey]));
    config.onSelect?.(selectedRows);
  };

  const handleSort = (col: TableColumn<T>) => {
    if (!col.isSortable || !col.onSort) return;

    const field = String(col.field);
    let direction: 'asc' | 'desc' = 'asc';

    if (sortState?.field === field && sortState.direction === 'asc') {
      direction = 'desc';
    }

    setSortState({ field, direction });
    col.onSort(field, direction);
  };

  return (
    <div className="bg-surface text-brand flex w-full flex-1 flex-col text-sm">
      {/* Header Row */}
      <div className="flex min-h-10 w-full items-center border-b border-gray-200 font-semibold text-gray-800 dark:border-gray-800 dark:text-gray-200">
        {config.isSelectable && (
          <div className="flex w-12 shrink-0 items-center justify-center">
            <Checkbox
              checked={data.length > 0 && selectedIds.size === data.length}
              onCheckedChange={handleSelectAll}
              aria-label="Select all"
              className="bg-surface cursor-pointer rounded-sm shadow-none"
            />
          </div>
        )}

        {config.columns.map((col, idx) => (
          <div
            key={`head-${idx}`}
            className={`cursor-pointer items-center px-4 py-2.5 select-none ${col.width || 'flex-1'} ${getVisibilityClass(col.visibleFrom)} ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'} `}
            onClick={() => handleSort(col)}
          >
            <span className="mr-2">{col.heading}</span>
            {col.isSortable && (
              <span className="text-gray-600 dark:text-gray-400">
                {sortState?.field === String(col.field) ? (
                  sortState.direction === 'asc' ? (
                    <ArrowUp size={14} />
                  ) : (
                    <ArrowDown size={14} />
                  )
                ) : (
                  <ArrowUpDown size={14} />
                )}
              </span>
            )}
          </div>
        ))}

        {config.rowActions && <div className="flex w-12 shrink-0 justify-center px-4 py-2.5"></div>}
      </div>

      {/* Data Rows */}
      <div className="flex w-full flex-1 flex-col">
        {isLoading ? (
          <section className="mt-4 flex min-h-[65vh] w-full flex-1 items-center justify-center bg-gray-50 dark:bg-neutral-800">
            <Loader className="h-7! w-7!" />
          </section>
        ) : data.length === 0 ? (
          <section className="mt-4 flex min-h-[65vh] w-full flex-1 items-center justify-center bg-gray-50 dark:bg-neutral-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
          </section>
        ) : (
          data.map((row) => {
            const rowId = row[config.uniqueKey] as string | number;
            const isSelected = selectedIds.has(rowId);

            return (
              <div
                key={String(rowId)}
                className={`hover:bg-brand-purple-soft/70 dark:hover:bg-brand-purple/10 flex w-full items-center border-b border-gray-200 transition-colors last:border-0 dark:border-gray-800 ${isSelected ? 'bg-yellow-50/50 dark:bg-yellow-900/20' : ''} ${config.rowClass || ''} `}
              >
                {config.isSelectable && (
                  <div className="flex h-full w-12 shrink-0 items-center justify-center py-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleSelectRow(row)}
                      aria-label="Select row"
                      className="bg-surface cursor-pointer rounded-sm shadow-none"
                    />
                  </div>
                )}

                {config.columns.map((col, idx) => (
                  <div
                    key={`cell-${rowId}-${idx}`}
                    className={`px-4 py-2.5 text-[0.8rem] wrap-break-word text-gray-700 dark:text-gray-300 ${col.width || 'flex-1'} ${getVisibilityClass(col.visibleFrom)} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} `}
                  >
                    {col.render
                      ? col.render(row)
                      : (getNestedValue(row, col.field) as ReactNode) || (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                  </div>
                ))}

                {config.rowActions && (
                  <div className="flex w-12 shrink-0 items-center justify-center px-2 py-3">
                    {config.rowActions(row)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
