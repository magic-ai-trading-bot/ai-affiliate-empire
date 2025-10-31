'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type Preset = {
  label: string;
  getValue: () => DateRange;
};

const presets: Preset[] = [
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      to: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'This month',
    getValue: () => ({
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Last month',
    getValue: () => ({
      from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
      to: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    }),
  },
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [fromDate, setFromDate] = useState(value?.from || '');
  const [toDate, setToDate] = useState(value?.to || '');
  const [selectedPreset, setSelectedPreset] = useState<string>('Last 30 days');

  const handlePresetClick = (preset: Preset) => {
    const range = preset.getValue();
    setSelectedPreset(preset.label);
    setIsCustom(false);
    setFromDate(range.from);
    setToDate(range.to);
    onChange(range);
  };

  const handleCustomApply = () => {
    if (fromDate && toDate && fromDate <= toDate) {
      onChange({ from: fromDate, to: toDate });
      setSelectedPreset('Custom');
    }
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
    setIsCustom(true);
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
    setIsCustom(true);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant={selectedPreset === preset.label && !isCustom ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          variant={isCustom ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsCustom(true)}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Custom
        </Button>
      </div>

      {/* Custom Date Inputs */}
      {isCustom && (
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 min-w-0">
            <label htmlFor="from-date" className="text-sm font-medium block mb-1">
              From
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={handleFromChange}
              className="w-full px-3 py-2 border rounded-md bg-background"
              max={toDate || undefined}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label htmlFor="to-date" className="text-sm font-medium block mb-1">
              To
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={handleToChange}
              className="w-full px-3 py-2 border rounded-md bg-background"
              min={fromDate || undefined}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <Button onClick={handleCustomApply} disabled={!fromDate || !toDate || fromDate > toDate}>
            Apply
          </Button>
        </div>
      )}

      {/* Validation Error */}
      {isCustom && fromDate && toDate && fromDate > toDate && (
        <p className="text-sm text-red-500">End date must be after start date</p>
      )}
    </div>
  );
}
