'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

interface PaginatedTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  keyExtractor: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | number;
  rowsPerPage?: number;
  emptyMessage?: string;
  rowClassName?: (row: T, isSelected: boolean) => string;
  searchPlaceholder?: string;
  showSearch?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export default function PaginatedTable<T = any>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  selectedRowKey,
  rowsPerPage = 10,
  emptyMessage = 'Keine Daten vorhanden',
  rowClassName,
  searchPlaceholder = 'Suchen...',
  showSearch = true,
}: PaginatedTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Reset to page 1 when data or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length, searchTerm]);

  // Filterung (Suche)
  const searchableColumns = columns.filter(col => col.searchable !== false);
  const filteredData = data.filter(row => {
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase();
    return searchableColumns.some(col => {
      const value = (row as any)[col.key];
      if (value === null || value === undefined) return false;
      
      // Handle nested objects (e.g., GS.GSName)
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(v => 
          String(v).toLowerCase().includes(term)
        );
      }
      
      // Handle arrays
      if (Array.isArray(value)) {
        return value.some(item => 
          typeof item === 'object' 
            ? Object.values(item).some(v => String(v).toLowerCase().includes(term))
            : String(item).toLowerCase().includes(term)
        );
      }
      
      return String(value).toLowerCase().includes(term);
    });
  });

  // Sortierung
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn || !sortDirection) return 0;

    const aValue = (a as any)[sortColumn];
    const bValue = (b as any)[sortColumn];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue, 'de-DE');
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue), 'de-DE');
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return null;

    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />;
    }

    if (sortDirection === 'asc') {
      return <ChevronUp className="w-3.5 h-3.5 text-primary" />;
    }

    return <ChevronDown className="w-3.5 h-3.5 text-primary" />;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {showSearch && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-2 text-left font-semibold text-gray-600 ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                  } ${column.className || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.label}</span>
                    {renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const rowKey = keyExtractor(row);
                const isSelected = selectedRowKey === rowKey;
                const defaultClassName = `transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                } ${isSelected ? 'bg-primary/10' : ''}`;
                const finalClassName = rowClassName
                  ? rowClassName(row, isSelected)
                  : defaultClassName;

                return (
                  <tr
                    key={rowKey}
                    className={finalClassName}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((column) => {
                      const value = (row as any)[column.key];
                      return (
                        <td
                          key={column.key}
                          className={`px-3 py-2 text-gray-700 ${column.className || ''}`}
                        >
                          {column.render ? column.render(value, row) : (value ?? '-')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="border-t border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-700">
            Zeige {startIndex + 1} bis {Math.min(endIndex, sortedData.length)} von {sortedData.length} Einträgen
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Zurück
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-xs rounded-lg ${
                        currentPage === page
                          ? 'bg-primary text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 text-gray-400">...</span>;
                }
                return null;
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
