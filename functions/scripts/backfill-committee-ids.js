/**
 * One-time backfill script: populate committeeIds on user documents.
 *
 * What it does:
 *   - Reads every committee from Firestore
 *   - For each committee, reads every document in the /members subcollection
 *   - For each member, appends that committeeId to the member's user doc
 *     using arrayUnion (safe to run multiple times — no duplicate entries)
 *
 * Usage:
 *   node backfill-committee-ids.js <path-to-service-account.json>
 *
 *   Or, if you already ran `gcloud auth application-default login`,
 *   just run:
 *   node backfill-committee-ids.js
 *
 * How to get a service account key:
 *   1. Firebase Console → Project Settings → Service accounts
 *   2. Click "Generate new private key"
 *   3. Save the JSON file somewhere (do NOT commit it to git)
 *   4. Pass the path as the first argument to this script
 */

'use strict';

const admin = require('firebase-admin');
const path = require('path');

// ── Initialize Admin SDK ───────────────────────────────────────────────────

const serviceAccountPath = process.argv[2];

if (serviceAccountPath) {
  const serviceAccount = require(path.resolve(serviceAccountPath));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'ldms-fb7ac',
  });
  console.log('Initialized with service account:', serviceAccountPath);
} else {
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var or gcloud ADC
  admin.initializeApp({
    projectId: 'ldms-fb7ac',
  });
  console.log('Initialized with application default credentials.');
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ── Main ──────────────────────────────────────────────────────────────────

async function backfill() {
  console.log('\n=== LDMS committeeIds backfill ===\n');

  // 1. Load all committees
  const committeesSnap = await db.collection('committees').get();
  if (committeesSnap.empty) {
    console.log('No committees found. Nothing to do.');
    return;
  }

  console.log(`Found ${committeesSnap.size} committees.\n`);

  let totalMembers = 0;
  let totalUpdates = 0;
  let totalErrors = 0;

  // Process committees one at a time to keep memory usage low
  for (const committeeDoc of committeesSnap.docs) {
    const committeeId = committeeDoc.id;
    const committeeName = committeeDoc.data().name ?? committeeId;

    // 2. Load all members for this committee
    const membersSnap = await db
      .collection('committees')
      .doc(committeeId)
      .collection('members')
      .get();

    if (membersSnap.empty) {
      console.log(`  [${committeeName}] — no members, skipping`);
      continue;
    }

    console.log(`  [${committeeName}] — ${membersSnap.size} member(s)`);
    totalMembers += membersSnap.size;

    // 3. Batch-write arrayUnion updates (Firestore max 500 ops per batch)
    const BATCH_SIZE = 400;
    let batch = db.batch();
    let batchCount = 0;

    for (const memberDoc of membersSnap.docs) {
      const userId = memberDoc.id;
      const displayName = memberDoc.data().displayName ?? userId;

      const userRef = db.collection('users').doc(userId);
      batch.update(userRef, {
        committeeIds: FieldValue.arrayUnion(committeeId),
      });
      batchCount++;
      totalUpdates++;

      console.log(`    + ${displayName} (${userId})`);

      // Flush batch if at limit
      if (batchCount >= BATCH_SIZE) {
        try {
          await batch.commit();
          console.log(`    → Flushed batch of ${batchCount}`);
        } catch (err) {
          console.error(`    ✗ Batch commit failed:`, err.message);
          totalErrors += batchCount;
          totalUpdates -= batchCount;
        }
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Flush remaining ops for this committee
    if (batchCount > 0) {
      try {
        await batch.commit();
      } catch (err) {
        console.error(`    ✗ Batch commit failed:`, err.message);
        totalErrors += batchCount;
        totalUpdates -= batchCount;
      }
    }
  }

  console.log('\n=== Done ===');
  console.log(`Total members processed : ${totalMembers}`);
  console.log(`User docs updated       : ${totalUpdates}`);
  if (totalErrors > 0) {
    console.log(`Errors (skipped)        : ${totalErrors}`);
    console.log('\nTip: errors usually mean the user doc does not exist for that userId.');
    console.log('Check those userIds manually in the Firestore console.\n');
  } else {
    console.log('\nAll updates succeeded. Safe to run again — arrayUnion is idempotent.\n');
  }

  process.exit(0);
}

backfill().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
