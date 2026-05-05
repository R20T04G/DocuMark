'use client';

import { useRef, useState, type DragEvent } from 'react';

import { ACCEPTED_FILE_TYPES } from './conversion-data';
import { formatBytes, matchInputFormat } from './conversion-utils';

type ConversionDropzoneProps = {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onClear: () => void;
};

export function ConversionDropzone({ file, onFileSelect, onClear }: ConversionDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const selectedInput = matchInputFormat(file?.name);

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    onFileSelect(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div
      onClick={openPicker}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPicker();
        }
      }}
      className={`rounded-[1.75rem] border border-dashed p-6 transition ${isDragging ? 'border-amber-300/60 bg-amber-300/10' : 'border-white/15 bg-slate-950/50 hover:border-white/25 hover:bg-slate-950/70'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
        className="hidden"
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3v10m0 0 3.5-3.5M12 13l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Drop files here or choose one manually</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Supported inputs: .docx, .xlsx, .pptx, and .pdf.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
            {file
              ? (
                <>
                  <span className="font-medium text-white">{file.name}</span>
                  <span className="mx-2 text-slate-500">•</span>
                  <span>{formatBytes(file.size)}</span>
                  <span className="mx-2 text-slate-500">•</span>
                  <span>{selectedInput?.label ?? 'Document'}</span>
                </>
              )
              : 'No file selected yet. Drop a document into the panel or use the button on the right.'}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
          >
            Choose file
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Clear selection
          </button>
        </div>
      </div>
    </div>
  );
}