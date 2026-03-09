/**
 * LDMS Cloud Functions — Entry Point
 * Region: asia-east1
 *
 * Exports:
 *   writeAuditLog     — Callable: client-called audit log writer
 *   onReferralCreated — Trigger: notify committee chair on referral
 *   onDocumentStatusChanged — Trigger: notify author on terminal status
 *   onDocumentStatusUpdate  — Trigger: write version snapshot on status change
 *   processAiJob      — Trigger: process AI classification jobs (stub)
 */

import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'asia-east1' });

export { writeAuditLog } from './audit-logs';
export { onReferralCreated, onDocumentStatusChanged } from './notifications';
export { onDocumentStatusUpdate } from './version-tracking';
export { processAiJob } from './ai-processing';
