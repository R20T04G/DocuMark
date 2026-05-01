'use client';

import { useState } from 'react';

type ConvertResponse = {
  message?: string;
  markdown?: string;
  detail?: string;
  title?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || isUploading) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    setResponse('');

    try {
      const res = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type') ?? '';
      const data = contentType.includes('application/json') || contentType.includes('+json')
        ? (await res.json()) as ConvertResponse
        : await res.text();

      if (!res.ok) {
        const message =
          typeof data === 'string'
            ? data
            : data.detail ?? data.message ?? data.title ?? 'Upload failed. Please try again.';
        throw new Error(message);
      }

      const markdown =
        typeof data === 'string'
          ? data
          : data.markdown ?? data.message ?? 'Conversion complete.';
      setResponse(markdown);
    } catch (error) {
      setResponse(
        error instanceof Error
          ? error.message
          : 'Upload failed. Check the console and ensure the backend is running.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-6 flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-300/80">DocuMark</p>
          <h1 className="text-3xl font-bold tracking-tight">Word document to Markdown</h1>
          <p className="text-sm text-slate-300">
            Upload a .docx file and the frontend will proxy it to the .NET backend.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-lg border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-amber-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-amber-400"
          />

          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="rounded-lg bg-amber-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            {isUploading ? 'Converting...' : 'Convert to Markdown'}
          </button>

          <p className="text-xs text-slate-400">
            Supported format: .docx only.
          </p>
        </div>

        {response && (
          <pre className="mt-6 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-emerald-400/20 bg-black/40 p-4 text-sm leading-6 text-emerald-200">
            {response}
          </pre>
        )}
      </div>
    </main>
  );
}