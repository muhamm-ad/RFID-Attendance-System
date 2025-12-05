// components/DataTable.tsx
"use client";

import React, { useMemo, ReactNode, useState } from "react";
import { ArrowUpDown } from "lucide-react";

export type SortDirection = "asc" | "desc" | null;

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  sortKey?: string;
  render: (item: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  limit?: number;
  defaultSortKey?: string;
  defaultSortDirection?: SortDirection;
  onSort?: (key: string, direction: SortDirection) => void;
  getSortValue?: (item: T, key: string) => any;
}

export default function DataTable<T extends { id?: number | string }>({
  data,
  columns,
  loading = false,
  emptyMessage = "No records found",
  limit = 100,
  defaultSortKey,
  defaultSortDirection = null,
  onSort,
  getSortValue,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(
    defaultSortKey || null
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    defaultSortKey && defaultSortDirection ? defaultSortDirection : null
  );

  const handleSort = (key: string) => {
    if (!onSort && !getSortValue) {
      // If no sort handlers provided, don't allow sorting
      return;
    }

    let newDirection: SortDirection = "asc";
    if (sortKey === key) {
      if (sortDirection === "asc") {
        newDirection = "desc";
      } else if (sortDirection === "desc") {
        newDirection = null;
      }
    }

    setSortKey(newDirection ? key : null);
    setSortDirection(newDirection);

    if (onSort) {
      onSort(key, newDirection);
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection || !getSortValue) {
      return data.slice(0, limit);
    }

    const sorted = [...data].sort((a, b) => {
      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (sortDirection === "asc") {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });

    return sorted.slice(0, limit);
  }, [data, sortKey, sortDirection, getSortValue, limit]);

  const getSortIcon = (columnKey: string) => {
    if (!sortKey || sortKey !== columnKey) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return (
      <ArrowUpDown
        size={14}
        className={sortDirection === "asc" || sortDirection === "desc" ? "text-indigo-600" : "text-gray-400"}
      />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable !== false
                    ? "cursor-pointer hover:bg-gray-100"
                    : ""
                } ${column.headerClassName || ""}`}
                onClick={() =>
                  column.sortable !== false && handleSort(column.sortKey || column.key)
                }
              >
                <div className="flex items-center gap-1">
                  {column.label}
                  {column.sortable !== false && getSortIcon(column.sortKey || column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-500"
              >
                Loading...
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((item) => (
              <tr key={item.id || JSON.stringify(item)} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 whitespace-nowrap ${column.cellClassName || ""}`}
                  >
                    {column.render(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

