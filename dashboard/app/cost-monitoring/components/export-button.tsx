'use client';

import { useState } from 'react';
import { Download, FileText, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  onExport: (format: 'csv' | 'json') => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

export function ExportButton({ onExport, disabled = false, className }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    setShowDropdown(false);

    try {
      await onExport(format);
      toast.success(`Report exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || isExporting}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>

      {showDropdown && !isExporting && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover border z-20 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
            <div className="py-1" role="menu">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center w-full px-4 py-2 text-sm hover:bg-accent transition-colors"
                role="menuitem"
              >
                <FileText className="h-4 w-4 mr-3" />
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="flex items-center w-full px-4 py-2 text-sm hover:bg-accent transition-colors"
                role="menuitem"
              >
                <FileJson className="h-4 w-4 mr-3" />
                Export as JSON
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
