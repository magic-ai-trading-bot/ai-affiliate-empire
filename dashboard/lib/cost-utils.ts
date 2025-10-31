import { format } from 'date-fns';

// Provider color mapping using chart CSS variables
export const providerColors: Record<string, string> = {
  openai: 'hsl(var(--chart-1))',
  claude: 'hsl(var(--chart-2))',
  elevenlabs: 'hsl(var(--chart-3))',
  pikalabs: 'hsl(var(--chart-4))',
  dalle: 'hsl(var(--chart-5))',
};

// Provider display names
export const providerNames: Record<string, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  elevenlabs: 'ElevenLabs',
  pikalabs: 'Pika Labs',
  dalle: 'DALL-E',
};

// Format cost as USD currency
export function formatCost(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Calculate percentage with fallback
export function calculatePercentage(spent: number, limit: number): number {
  if (limit === 0) return 0;
  return (spent / limit) * 100;
}

// Get provider color
export function getProviderColor(provider: string): string {
  return providerColors[provider.toLowerCase()] || 'hsl(var(--muted))';
}

// Get provider display name
export function getProviderName(provider: string): string {
  return providerNames[provider.toLowerCase()] || provider;
}

// Get status color based on percentage
export function getStatusColor(percentage: number): string {
  if (percentage >= 100) return 'hsl(var(--destructive))';
  if (percentage >= 80) return 'hsl(var(--warning))';
  return 'hsl(var(--success))';
}

// Get alert type color
export function getAlertColor(type: 'warning' | 'danger' | 'critical'): string {
  switch (type) {
    case 'warning':
      return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    case 'danger':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'critical':
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    default:
      return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
}

// Get impact color
export function getImpactColor(impact: 'low' | 'medium' | 'high'): string {
  switch (impact) {
    case 'high':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'medium':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'low':
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
  }
}

// Get status badge color
export function getStatusBadgeColor(status: 'pending' | 'applied' | 'rejected'): string {
  switch (status) {
    case 'applied':
      return 'bg-green-500/10 text-green-600 dark:text-green-400';
    case 'rejected':
      return 'bg-red-500/10 text-red-600 dark:text-red-400';
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
    default:
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  }
}

// Export data to CSV
export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return;

  // Get headers from first object
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  downloadFile(csvContent, filename, 'text/csv');
}

// Export data to JSON
export function exportToJSON(data: any, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}

// Download file helper
function downloadFile(content: string, filename: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Format date for display
export function formatDate(date: Date | string): string {
  return format(new Date(date), 'MMM dd, yyyy');
}

// Format datetime for display
export function formatDateTime(date: Date | string): string {
  return format(new Date(date), 'MMM dd, yyyy HH:mm');
}

// Format date for API (YYYY-MM-DD)
export function formatDateForAPI(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Calculate change percentage
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
