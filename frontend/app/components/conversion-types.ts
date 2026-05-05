export type OutputFormat = 'markdown' | 'csv-bundle';

export type ConversionSheet = {
  sheetName: string;
  rowCount: number;
  fileName?: string | null;
};

export type ConversionResponse = {
  message?: string;
  inputFormat?: string;
  outputFormat?: OutputFormat;
  fileName?: string;
  contentType?: string;
  content?: string | null;
  markdown?: string | null;
  preview?: string | null;
  contentBase64?: string | null;
  sheets?: ConversionSheet[] | null;
  detail?: string;
  title?: string;
};

export type SupportedInput = {
  extension: string;
  label: string;
  description: string;
  note: string;
};

export type OutputOption = {
  value: OutputFormat;
  label: string;
  description: string;
  helper: string;
  spreadsheetOnly?: boolean;
};

export type DetailRow = {
  label: string;
  value: string;
};

export type WorkflowStep = {
  title: string;
  description: string;
};