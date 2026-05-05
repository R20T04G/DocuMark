import type { OutputOption, SupportedInput, WorkflowStep } from './conversion-types';

export const ACCEPTED_FILE_TYPES = [
  '.docx',
  '.xlsx',
  '.pptx',
  '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/pdf',
].join(',');

export const SUPPORTED_INPUTS: SupportedInput[] = [
  {
    extension: '.docx',
    label: 'Word',
    description: 'Preserves headings, lists, and tables in Markdown.',
    note: 'Best for notes, briefs, and structured documents.',
  },
  {
    extension: '.xlsx',
    label: 'Excel',
    description: 'Exports Markdown tables or a ZIP bundle of CSVs.',
    note: 'Spreadsheet exports can switch to CSV bundles.',
  },
  {
    extension: '.pptx',
    label: 'PowerPoint',
    description: 'Converts slides into structured outlines.',
    note: 'Useful for meeting decks and workshop recaps.',
  },
  {
    extension: '.pdf',
    label: 'PDF',
    description: 'Normalizes wrapped lines into readable Markdown.',
    note: 'Good for reports, scans, and text-heavy PDFs.',
  },
];

export const OUTPUT_OPTIONS: OutputOption[] = [
  {
    value: 'markdown',
    label: 'Markdown (.md)',
    description: 'Structured logs with readable headings, lists, and tables.',
    helper: 'Available for every supported file type.',
  },
  {
    value: 'csv-bundle',
    label: 'CSV bundle (.zip)',
    description: 'One CSV file per worksheet, packaged into a ZIP archive.',
    helper: 'Excel workbooks only.',
    spreadsheetOnly: true,
  },
];

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    title: 'Upload',
    description: 'Choose a document, presentation, PDF, or workbook from your machine.',
  },
  {
    title: 'Convert',
    description: 'Select Markdown or an Excel CSV bundle and let the backend format it.',
  },
  {
    title: 'Download',
    description: 'Review the preview and download the generated file immediately.',
  },
];