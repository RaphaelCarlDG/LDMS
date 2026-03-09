import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './admin';

/**
 * Triggered when a new AI job document is written to the aiJobs collection.
 * Processes AI classification/summarization jobs using Firebase AI Logic (Gemini).
 *
 * NOTE: Firebase AI Logic / Gemini integration is NOT YET WIRED.
 * This function currently updates the job status to 'failed' with a TODO note.
 * Replace the stub body with actual Gemini API calls when the AI agent implements it.
 */
export const processAiJob = onDocumentCreated(
  {
    document: 'aiJobs/{jobId}',
    region: 'asia-east1',
  },
  async (event) => {
    const job = event.data?.data();
    if (!job) return;

    const jobRef = db.collection('aiJobs').doc(event.params.jobId);

    // Mark as processing
    await jobRef.update({
      status: 'processing',
      startedAt: FieldValue.serverTimestamp(),
    });

    try {
      // TODO: Replace this stub with actual Firebase AI Logic / Gemini call.
      // The AI agent will implement:
      //   1. Load document content from Storage (job.storagePath)
      //   2. Call Gemini for classification + keyword extraction + summary
      //   3. Write results back to the parent document's aiTags, aiSummary, aiConfidence
      //   4. Mark job as completed

      throw new Error('AI processing not yet implemented. Awaiting AI agent.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await jobRef.update({
        status: 'failed',
        error: message,
        completedAt: FieldValue.serverTimestamp(),
      });
    }
  },
);
