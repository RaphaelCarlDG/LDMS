import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './admin';

interface AuditLogPayload {
  action: string;
  resourceType: string;
  resourceId: string;
  resourceTitle?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Callable function to write a single audit log entry.
 * Called by the Angular client after any significant action.
 * Writes to date-sharded auditLogs_YYYY_MM collections.
 * Field names match the AuditLog TypeScript model exactly.
 */
export const writeAuditLog = onCall<AuditLogPayload>({ region: 'asia-east1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated.');
  }

  const { action, resourceType, resourceId, resourceTitle, metadata } = request.data;

  if (!action || !resourceType || !resourceId) {
    throw new HttpsError('invalid-argument', 'action, resourceType, and resourceId are required.');
  }

  // Look up the caller's Firestore user document for name and role
  const userSnap = await db.collection('users').doc(request.auth.uid).get();
  const userData = userSnap.data() ?? {};
  const actorName =
    (userData['fullName'] as string | undefined) ??
    (userData['_displayName'] as string | undefined) ??
    request.auth.token.email ??
    request.auth.uid;
  const actorRole = (userData['role'] as string | undefined) ?? 'unknown';

  // Extract client IP (Cloud Run passes it in x-forwarded-for)
  const forwardedFor = request.rawRequest.headers['x-forwarded-for'];
  const actorIp =
    (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : null) ?? null;

  // Extract user-agent as a proxy for device/browser
  const actorDevice = (request.rawRequest.headers['user-agent'] as string | undefined) ?? null;

  // Build the metadata object; fold in resourceTitle if provided
  const meta: Record<string, unknown> = { ...(metadata ?? {}) };
  if (resourceTitle) {
    meta['entityTitle'] = resourceTitle;
  }

  const now = new Date();
  const shardKey = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
  const collectionName = `auditLogs_${shardKey}`;

  await db.collection(collectionName).add({
    // Actor fields — match AuditLog model
    actorId: request.auth.uid,
    actorName,
    actorRole,
    actorIp,
    actorDevice,
    sessionToken: null,
    // Action + entity fields — match AuditLog model
    action,
    entityType: resourceType,
    entityId: resourceId,
    metadata: meta,
    _immutable: true,
    timestamp: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
