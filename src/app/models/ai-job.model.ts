import { Timestamp } from '@angular/fire/firestore';

export type AiPipelineStep =
  | 'ocr'
  | 'nlp_tagging'
  | 'keyword_extraction'
  | 'summarization'
  | 'linking';

export type AiStepStatus = 'queued' | 'running' | 'completed' | 'failed';

export type AiJobStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'partial';

export interface AiPipelineStepRecord {
  step: AiPipelineStep;
  status: AiStepStatus;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  errorMessage: string | null;
  output: unknown | null;
}

export interface AiJob {
  jobId: string;
  documentId: string;
  triggeredById: string | null;

  pipeline: AiPipelineStepRecord[];

  overallStatus: AiJobStatus;
  retryCount: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
}
