import type { ExportOptions } from '@/types/metrics';

/**
 * Export data to CSV format
 */
export function exportToCSV(options: ExportOptions): void {
  const { data, columns, filename } = options;

  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Determine columns from data if not provided
  const cols = columns || Object.keys(data[0]);

  // Create CSV header
  const header = cols.join(',');

  // Create CSV rows
  const rows = data.map((row) =>
    cols.map((col) => {
      const value = row[col];
      // Escape commas and quotes in values
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to JSON format
 */
export function exportToJSON(options: ExportOptions): void {
  const { data, filename } = options;

  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export metrics data based on format
 */
export function exportMetrics(options: ExportOptions): void {
  if (options.format === 'csv') {
    exportToCSV(options);
  } else if (options.format === 'json') {
    exportToJSON(options);
  } else {
    console.error('Unsupported export format:', options.format);
  }
}

