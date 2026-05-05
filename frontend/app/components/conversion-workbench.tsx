'use client';

import { useState } from 'react';

import { ConversionChoiceCard } from './conversion-cards';
import { ConversionDropzone } from './conversion-dropzone';
import { ConversionPanel } from './conversion-panel';
import { ConversionResultPanel } from './conversion-result-panel';
import { OUTPUT_OPTIONS } from './conversion-data';
import { SupportedInputsSection, WorkflowSection } from './conversion-sections';
import type { ConversionResponse, OutputFormat } from './conversion-types';
import { createDownloadBlob, getFallbackDownloadName, getOutputLabel, matchInputFormat } from './conversion-utils';

export function ConversionWorkbench() {
  const [file, setFile] = useState<File | null>(null);
  const [selectedOutput, setSelectedOutput] = useState<OutputFormat>('markdown');
  const [result, setResult] = useState<ConversionResponse | null>(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const selectedInput = matchInputFormat(file?.name);
  const selectedOutputLabel = getOutputLabel(selectedOutput);
  const isSpreadsheet = selectedInput?.extension === '.xlsx';
  const downloadFileName = result?.fileName ?? getFallbackDownloadName(file?.name, result?.outputFormat ?? selectedOutput);

  const resetSelection = () => {
    setFile(null);
    setResult(null);
    setError('');
    setSelectedOutput('markdown');
  };

  const handleUpload = async () => {
    if (!file || isUploading) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('outputFormat', selectedOutput);

    setIsUploading(true);
    setResult(null);
    setError('');

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json') || contentType.includes('+json')
        ? (await response.json()) as ConversionResponse
        : await response.text();

      if (!response.ok) {
        const message = typeof payload === 'string'
          ? payload
          : payload.detail ?? payload.message ?? payload.title ?? 'Upload failed. Please try again.';
        throw new Error(message);
      }

      const normalizedPayload: ConversionResponse = typeof payload === 'string'
        ? {
            message: 'Conversion successful!',
            outputFormat: 'markdown',
            fileName: getFallbackDownloadName(file.name, 'markdown'),
            contentType: 'text/markdown; charset=utf-8',
            content: payload,
            markdown: payload,
            preview: payload,
          }
        : payload;

      setResult(normalizedPayload);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Upload failed. Check that the backend is running and try again.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (!result) {
      return;
    }

    const blob = createDownloadBlob(result);
    const blobUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = blobUrl;
    downloadLink.download = result.fileName ?? downloadFileName;
    downloadLink.rel = 'noopener';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    URL.revokeObjectURL(blobUrl);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-7rem] top-[-6rem] h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute right-[-10rem] top-24 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-8 lg:py-12">
        <header className="mb-10 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg shadow-black/20 backdrop-blur">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 3h7l5 5v13H7V3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M10 12h4M10 16h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.38em] text-amber-200/80">DocuMark</p>
              <p className="text-sm text-slate-400">Document conversion studio</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Convert office files into polished Markdown or CSV bundles.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                Upload Word, Excel, PowerPoint, or PDF files. The frontend posts them through the Next.js proxy,
                and the .NET backend returns formatted Markdown or a ZIP archive of CSV files for spreadsheets.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/10 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Ready workflow</span>
                <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">Upload, convert, and download from a single screen.</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Reusable cards below handle the repeated upload, selection, and result patterns.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <ConversionPanel
              eyebrow="Upload and convert"
              title="Choose a file and output format"
              description="Markdown is available for every supported file type. Excel workbooks can also be exported as a ZIP bundle that contains one CSV per sheet."
              action={
                <button
                  type="button"
                  onClick={resetSelection}
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Reset
                </button>
              }
            >
              <ConversionDropzone
                file={file}
                onFileSelect={(nextFile) => {
                  setFile(nextFile);
                  setResult(null);
                  setError('');
                  setSelectedOutput('markdown');
                }}
                onClear={resetSelection}
              />
            </ConversionPanel>

            <ConversionPanel
              eyebrow="Output format"
              title="Pick the export that matches the input"
              description="CSV bundles are only enabled for Excel files. Markdown stays available for everything."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {OUTPUT_OPTIONS.map((option) => {
                  const disabled = option.spreadsheetOnly && !isSpreadsheet;

                  return (
                    <ConversionChoiceCard
                      key={option.value}
                      title={option.label}
                      description={option.description}
                      helper={option.helper}
                      badge={disabled ? 'Excel only' : 'Ready'}
                      isSelected={selectedOutput === option.value}
                      disabled={disabled}
                      onSelect={() => setSelectedOutput(option.value)}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {isUploading ? 'Converting file...' : `Convert to ${selectedOutputLabel}`}
              </button>

              <p className="mt-3 text-xs leading-6 text-slate-400">
                The .NET backend now formats Markdown more carefully, and Excel exports can be downloaded as a ZIP archive of CSV files.
              </p>
            </ConversionPanel>
          </div>

          <aside className="space-y-6">
            <SupportedInputsSection />

            <ConversionPanel
              eyebrow="Backend behavior"
              title="Formatted for readability"
              description="The backend preserves structure for document formats where the source provides it, then normalizes the result into readable Markdown or CSV output."
            >
              <ul className="space-y-3 text-sm leading-6 text-slate-300">
                <li>Word documents preserve headings, list items, and tables when the document styles expose them.</li>
                <li>PowerPoint slides are converted into structured outlines rather than a flat text dump.</li>
                <li>PDF pages are normalized into paragraph blocks so the Markdown stays readable.</li>
                <li>Excel exports can switch from Markdown tables to a ZIP bundle with one CSV per worksheet.</li>
              </ul>
            </ConversionPanel>

            <WorkflowSection />
          </aside>
        </section>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {error}
          </div>
        )}

        {result && (
          <ConversionResultPanel
            file={file}
            result={result}
            selectedInputLabel={selectedInput?.label ?? 'Document'}
            selectedOutputLabel={selectedOutputLabel}
            downloadFileName={downloadFileName}
            onDownload={handleDownload}
          />
        )}
      </div>
    </main>
  );
}