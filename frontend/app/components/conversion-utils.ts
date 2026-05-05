import { SUPPORTED_INPUTS } from './conversion-data';
import type { ConversionResponse, OutputFormat } from './conversion-types';

export function matchInputFormat(fileName?: string | null) {
  if (!fileName) {
    return null;
  }

  const normalizedFileName = fileName.toLowerCase();
  return SUPPORTED_INPUTS.find((input) => normalizedFileName.endsWith(input.extension)) ?? null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function getFallbackDownloadName(fileName: string | null | undefined, outputFormat: OutputFormat) {
  const baseName = fileName?.replace(/\.[^.]+$/, '') || 'output';
  return `${baseName}.${outputFormat === 'csv-bundle' ? 'zip' : 'md'}`;
}

export function getOutputLabel(outputFormat?: OutputFormat) {
  return outputFormat === 'csv-bundle' ? 'CSV bundle' : 'Markdown';
}

export function getContentType(outputFormat?: OutputFormat) {
  return outputFormat === 'csv-bundle' ? 'application/zip' : 'text/markdown; charset=utf-8';
}

export function decodeBase64(base64: string) {
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

export function createDownloadBlob(result: ConversionResponse) {
  if (result.contentBase64) {
    const bytes = decodeBase64(result.contentBase64);
    return new Blob([bytes], { type: result.contentType ?? getContentType(result.outputFormat) });
  }

  const textContent = result.content ?? result.markdown ?? result.preview ?? '';
  return new Blob([textContent], { type: result.contentType ?? getContentType(result.outputFormat) });
}
