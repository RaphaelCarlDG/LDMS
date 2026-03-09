import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './admin';

/**
 * Triggered when a document's status field changes.
 * Writes a version snapshot to documents/{id}/versions subcollection.
 */
export const onDocumentStatusUpdate = onDocumentUpdated(
  {
    document: 'documents/{docId}',
    region: 'asia-east1',
  },
  async (event) => {
    if (!event.data) return;

    const before = event.data.before.data();
    const after = event.data.after.data();

    if (!before || !after) return;

    // Only track status transitions
    if (before.status === after.status) return;

    await db
      .collection('documents')
      .doc(event.params.docId)
      .collection('versions')
      .add({
        documentId: event.params.docId,
        previousStatus: before.status,
        newStatus: after.status,
        // Top-level authorId is required so onDocumentStatusChanged (notifications.ts)
        // can read it directly from the version document without traversing snapshotData.
        authorId: after.authorId ?? null,
        changedAt: FieldValue.serverTimestamp(),
        // Note: Cloud Function triggers do not have user context.
        // If you need changedById, use the writeAuditLog callable instead.
        snapshotData: {
          title: after.title ?? null,
          type: after.type ?? null,
          status: after.status,
          authorId: after.authorId ?? null,
        },
      });
  },
);
