'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '../components/date-range-picker';
import { ExportButton } from '../components/export-button';
import { CostBreakdownChart } from '../components/cost-breakdown-chart';
import { CostTrendChart } from '../components/cost-trend-chart';
import { useReport } from '@/lib/cost-api';
import { formatCost, formatDate, exportToCSV, exportToJSON } from '@/lib/cost-utils';
import { format, subDays } from 'date-fns';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';

export default function ReportsPage() {
  const router = useRouter();
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [hasGenerated, setHasGenerated] = useState(false);

  const { data: report, isLoading } = useReport(
    hasGenerated ? dateRange.from : undefined,
    hasGenerated ? dateRange.to : undefined
  );

  const handleDateRangeChange = (range: { from: string; to: string }) => {
    setDateRange(range);
    setReportType('custom');
  };

  const handleReportTypeChange = (type: ReportType) => {
    setReportType(type);
    const today = new Date();

    switch (type) {
      case 'daily':
        setDateRange({
          from: format(today, 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        });
        break;
      case 'weekly':
        setDateRange({
          from: format(subDays(today, 7), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        });
        break;
      case 'monthly':
        setDateRange({
          from: format(subDays(today, 30), 'yyyy-MM-dd'),
          to: format(today, 'yyyy-MM-dd'),
        });
        break;
    }
  };

  const handleGenerateReport = () => {
    setHasGenerated(true);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!report) return;

    const filename = `cost-report-${dateRange.from}-to-${dateRange.to}.${format}`;

    if (format === 'csv') {
      const csvData = report.entries.map((entry) => ({
        Date: formatDate(entry.timestamp),
        Provider: entry.provider,
        Service: entry.service,
        Cost: entry.cost,
        Tokens: entry.tokens || 0,
      }));
      exportToCSV(csvData, filename);
    } else {
      exportToJSON(report, filename);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cost Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate detailed cost reports and export data
          </p>
        </div>
        <Button onClick={() => router.push('/cost-monitoring')} variant="outline" size="sm">
          Back to Dashboard
        </Button>
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Type</label>
            <div className="flex flex-wrap gap-2">
              {(['daily', 'weekly', 'monthly', 'custom'] as ReportType[]).map((type) => (
                <Button
                  key={type}
                  variant={reportType === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleReportTypeChange(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
          </div>

          {/* Generate Button */}
          <div className="flex gap-3">
            <Button onClick={handleGenerateReport} disabled={isLoading} className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {isLoading ? 'Generating...' : 'Generate Report'}
            </Button>
            {report && (
              <ExportButton onExport={handleExport} disabled={!report || isLoading} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Summary */}
      {isLoading && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Generating report...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {report && !isLoading && (
        <>
          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-3xl font-bold">{formatCost(report.summary.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date Range</p>
                  <p className="text-lg font-semibold">
                    {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Entries</p>
                  <p className="text-3xl font-bold">{report.entries.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average per Day</p>
                  <p className="text-3xl font-bold">
                    {formatCost(
                      report.summary.total /
                        Math.max(
                          1,
                          Math.ceil(
                            (new Date(dateRange.to).getTime() -
                              new Date(dateRange.from).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        )
                    )}
                  </p>
                </div>
              </div>

              {/* Breakdown by Provider */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-semibold mb-3">Cost by Provider</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {Object.entries(report.summary.byProvider).map(([provider, cost]) => (
                    <div
                      key={provider}
                      className="p-4 border rounded-lg bg-muted/30"
                    >
                      <p className="text-xs text-muted-foreground capitalize">{provider}</p>
                      <p className="text-xl font-bold mt-1">{formatCost(cost)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {((cost / report.summary.total) * 100).toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CostBreakdownChart data={report.summary.byProvider} />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Highest Cost Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.entries
                    .sort((a, b) => b.cost - a.cost)
                    .slice(0, 10)
                    .map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium capitalize">{entry.provider}</p>
                            <p className="text-xs text-muted-foreground">{entry.service}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{formatCost(entry.cost)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(entry.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Entries Table Summary */}
          <Card>
            <CardHeader>
              <CardTitle>All Entries ({report.entries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                Use the Export button above to download all entries as CSV or JSON
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Provider</th>
                      <th className="text-left py-2 px-3">Service</th>
                      <th className="text-right py-2 px-3">Cost</th>
                      <th className="text-right py-2 px-3">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.entries.slice(0, 20).map((entry) => (
                      <tr key={entry.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-3">{formatDate(entry.timestamp)}</td>
                        <td className="py-2 px-3 capitalize">{entry.provider}</td>
                        <td className="py-2 px-3">{entry.service}</td>
                        <td className="py-2 px-3 text-right font-semibold">
                          {formatCost(entry.cost)}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">
                          {entry.tokens?.toLocaleString() || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {report.entries.length > 20 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Showing 20 of {report.entries.length} entries. Export to see all.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!report && !isLoading && hasGenerated && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Data Found</h3>
            <p className="text-muted-foreground">
              No cost data available for the selected date range. Try a different period.
            </p>
          </CardContent>
        </Card>
      )}

      {!hasGenerated && (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Ready to Generate Report</h3>
            <p className="text-muted-foreground">
              Select a date range and click "Generate Report" to view detailed cost analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
