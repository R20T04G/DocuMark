'use client';

import type { ConversionResponse, DetailRow } from './conversion-types';

import { ConversionMetricCard, ConversionInfoCard } from './conversion-cards';
import { ConversionPanel } from './conversion-panel';
import { formatBytes, getContentType } from './conversion-utils';

type ConversionResultPanelProps = {
  file: File | null;
  result: ConversionResponse;
  selectedInputLabel: string;
  selectedOutputLabel: string;
  downloadFileName: string;
  onDownload: () => void;
};

export function ConversionResultPanel({
  file,
  result,
  selectedInputLabel,
  selectedOutputLabel,
  downloadFileName,
  onDownload,
}: ConversionResultPanelProps) {
  const previewText = result.preview ?? result.content ?? result.markdown ?? '';
  const sheetExports = result.sheets ?? [];

  const detailRows: DetailRow[] = [
    {
      label: 'Source file',
      value: file ? `${file.name} • ${formatBytes(file.size)}` : 'No file available.',
    },
    {
      label: 'Detected input',
      value: result.inputFormat ?? selectedInputLabel,
    },
    {
      label: 'Selected output',
      value: selectedOutputLabel,
    },
    {
      label: 'Download file',
      value: downloadFileName,
    },
    {
      label: 'Content type',
      value: result.contentType ?? getContentType(result.outputFormat),
    },
    {
      label: 'Backend status',
      value: result.message ?? 'Ready',
    },
  ];

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
      <ConversionPanel
        eyebrow="Conversion ready"
        title={downloadFileName}
        description={result.message ?? 'Your file has been converted and is ready to download.'}
        action={
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
          >
            Download {selectedOutputLabel}
          </button>
        }
        className="border-emerald-300/20 bg-emerald-300/8"
      >
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Preview</p>
              <p className="mt-1 text-sm text-slate-400">{result.contentType ?? getContentType(result.outputFormat)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                {result.inputFormat ?? selectedInputLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                {selectedOutputLabel}
              </span>
            </div>
          </div>

          <pre className="mt-4 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-2xl bg-black/35 p-4 text-sm leading-6 text-slate-200">
            {previewText || 'No preview returned yet.'}
          </pre>
        </div>
      </ConversionPanel>

      <div className="space-y-6">
        <ConversionPanel
          eyebrow="Export details"
          title="Everything the backend returned"
          description="The response includes the generated filename, content type, and a preview payload that the frontend can render or download."
        >
          <dl className="grid gap-3 sm:grid-cols-2">
            {detailRows.map((row) => (
              <ConversionMetricCard key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </ConversionPanel>

        <ConversionPanel
          eyebrow="Worksheet exports"
          title="Excel sheet breakdown"
          description="When the selected output is a CSV bundle, each worksheet is exported into the ZIP archive as its own CSV file."
        >
          {sheetExports.length > 0 ? (
            <div className="space-y-3">
              {sheetExports.map((sheet) => (
                <ConversionInfoCard
                  key={`${sheet.sheetName}-${sheet.fileName ?? 'sheet'}`}
                  title={sheet.sheetName}
                  description={sheet.fileName ? sheet.fileName : 'Included in the Markdown workbook preview.'}
                  badge={`${sheet.rowCount} rows`}
                  note={sheet.fileName ? 'Exported as a dedicated CSV file inside the ZIP bundle.' : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-400">
              Spreadsheet exports will list each worksheet here. Markdown previews show the workbook structure directly.
            </p>
          )}
        </ConversionPanel>
      </div>
    </section>
  );
}