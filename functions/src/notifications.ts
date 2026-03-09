import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './admin';

/**
 * Triggered when a new document referral is created.
 * Sends a notification to the committee chair.
 */
export const onReferralCreated = onDocumentCreated(
  {
    document: 'documents/{docId}/referrals/{referralId}',
    region: 'asia-east1',
  },
  async (event) => {
    const referral = event.data?.data();
    if (!referral) return;

    const { toCommitteeId, fromUserId } = referral;
    const documentId = event.params.docId;
    if (!toCommitteeId || !documentId) return;

    // Look up the committee to find the chair
    const committeeSnap = await db.collection('committees').doc(toCommitteeId).get();
    const committee = committeeSnap.data();
    if (!committee?.chairpersonId) return;

    await db.collection('notifications').add({
      recipientId: committee.chairpersonId,
      type: 'referral_received',
      title: 'New Document Referral',
      message: `A document has been referred to your committee for review.`,
      resourceType: 'document',
      resourceId: documentId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
      createdById: fromUserId ?? null,
    });
  },
);

/**
 * Triggered when a document status changes to approved/vetoed/lapsed.
 * Sends a notification to the document author.
 */
export const onDocumentStatusChanged = onDocumentCreated(
  {
    document: 'documents/{docId}/versions/{versionId}',
    region: 'asia-east1',
  },
  async (event) => {
    const version = event.data?.data();
    if (!version) return;

    const { newStatus, authorId, documentId, changedById } = version;
    const terminalStatuses = ['approved', 'vetoed', 'lapsed', 'archived'];
    if (!terminalStatuses.includes(newStatus) || !authorId) return;

    const statusLabels: Record<string, string> = {
      approved: 'approved',
      vetoed: 'vetoed by the executive',
      lapsed: 'lapsed',
      archived: 'archived',
    };

    await db.collection('notifications').add({
      recipientId: authorId,
      type: 'document_status_changed',
      title: 'Document Status Updated',
      message: `Your document has been ${statusLabels[newStatus] ?? newStatus}.`,
      resourceType: 'document',
      resourceId: documentId ?? event.params.docId,
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
      createdById: changedById ?? null,
    });
  },
);
