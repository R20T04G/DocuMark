'use client';

import { ConversionInfoCard } from './conversion-cards';
import { ConversionPanel } from './conversion-panel';
import { SUPPORTED_INPUTS, WORKFLOW_STEPS } from './conversion-data';

export function SupportedInputsSection() {
  return (
    <ConversionPanel
      eyebrow="Supported inputs"
      title="Clean, documented coverage"
      description="The backend accepts Word, Excel, PowerPoint, and PDF files, and each format keeps the structure that matters most."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {SUPPORTED_INPUTS.map((input) => (
          <ConversionInfoCard
            key={input.extension}
            title={input.label}
            description={input.description}
            badge={input.extension}
            note={input.note}
          />
        ))}
      </div>
    </ConversionPanel>
  );
}

export function WorkflowSection() {
  return (
    <ConversionPanel
      eyebrow="Workflow"
      title="Simple three-step flow"
      description="The app keeps the path from upload to download predictable: pick a file, select an output, and download the result."
    >
      <div className="grid gap-3">
        {WORKFLOW_STEPS.map((step, index) => (
          <ConversionInfoCard
            key={step.title}
            title={step.title}
            description={step.description}
            badge={`0${index + 1}`}
          />
        ))}
      </div>
    </ConversionPanel>
  );
}