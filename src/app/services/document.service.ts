import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { LdmsDocument, DocumentStatus, DocumentType, DocumentCategory, Referral } from '../models';
import { AuditLogService } from './audit-log.service';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private firestore = inject(Firestore);
  private auditLog = inject(AuditLogService);

  listDocuments$(): Observable<LdmsDocument[]> {
    const q = query(
      collection(this.firestore, 'documents'),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
    );
    return collectionData(q, { idField: 'documentId' }) as Observable<LdmsDocument[]>;
  }

  getDocument$(id: string): Observable<LdmsDocument> {
    return docData(doc(this.firestore, 'documents', id), {
      idField: 'documentId',
    }) as Observable<LdmsDocument>;
  }

  async createDocument(
    data: Partial<LdmsDocument>,
    authorId: string,
    authorName: string,
  ): Promise<string> {
    const barcodeId = `DOC-${Date.now().toString(36).toUpperCase()}`;
    const qrCode = `LDMS:${barcodeId}`;

    const ref = await addDoc(collection(this.firestore, 'documents'), {
      ...data,
      authorId,
      authorName,
      barcodeId,
      qrCode,
      status: 'draft' as DocumentStatus,
      aiProcessed: false,
      aiTags: [],
      aiKeywords: [],
      aiSummary: null,
      aiConfidenceScore: null,
      relatedDocumentIds: [],
      isDeleted: false,
      isPublished: false,
      currentVersion: 1,
      _searchTokens: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    this.simulateAi(ref.id, data.title ?? '', data.abstract ?? '');
    this.auditLog.logAction('document.created', 'document', ref.id, data.title);
    return ref.id;
  }

  async updateDocument(id: string, data: Partial<LdmsDocument>): Promise<void> {
    await updateDoc(doc(this.firestore, 'documents', id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async advanceStatus(id: string, status: DocumentStatus): Promise<void> {
    await updateDoc(doc(this.firestore, 'documents', id), {
      status,
      updatedAt: serverTimestamp(),
    });
    this.auditLog.logAction('document.status_changed', 'document', id, undefined, {
      newValue: status,
    });
  }

  listReferrals$(docId: string): Observable<Referral[]> {
    return collectionData(collection(this.firestore, 'documents', docId, 'referrals'), {
      idField: 'referralId',
    }) as Observable<Referral[]>;
  }

  async addReferral(docId: string, referral: Partial<Referral>): Promise<void> {
    await addDoc(collection(this.firestore, 'documents', docId, 'referrals'), {
      ...referral,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (referral.toCommitteeId) {
      await updateDoc(doc(this.firestore, 'documents', docId), {
        committeeId: referral.toCommitteeId,
        updatedAt: serverTimestamp(),
      });
    }
    this.auditLog.logAction('document.referred', 'document', docId);
  }

  async updateReferral(docId: string, referralId: string, data: Partial<Referral>): Promise<void> {
    await updateDoc(doc(this.firestore, 'documents', docId, 'referrals', referralId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  // ── Simulated AI ──────────────────────────────────────────────────────────
  private simulateAi(docId: string, title: string, description: string): void {
    const text = `${title} ${description}`.toLowerCase();

    const categoryMap: Record<string, DocumentCategory> = {
      health: 'health',
      medical: 'health',
      hospital: 'health',
      disease: 'health',
      sanitation: 'health',
      budget: 'finance',
      tax: 'finance',
      appropriation: 'finance',
      fund: 'finance',
      revenue: 'finance',
      road: 'infrastructure',
      bridge: 'infrastructure',
      construction: 'infrastructure',
      infrastructure: 'infrastructure',
      building: 'infrastructure',
      school: 'education',
      education: 'education',
      scholarship: 'education',
      student: 'education',
      teacher: 'education',
      environment: 'environment',
      waste: 'environment',
      pollution: 'environment',
      climate: 'environment',
      forest: 'environment',
      welfare: 'social_welfare',
      housing: 'social_welfare',
      poverty: 'social_welfare',
      aid: 'social_welfare',
      ordinance: 'governance',
      resolution: 'governance',
      policy: 'governance',
      regulation: 'governance',
      governance: 'governance',
    };

    const matchedKeywords = Object.keys(categoryMap).filter((k) => text.includes(k));
    const aiCategory: DocumentCategory =
      matchedKeywords.length > 0 ? categoryMap[matchedKeywords[0]] : 'other';
    const aiTags = [...new Set(matchedKeywords.map((k) => categoryMap[k]))];
    const aiKeywords = matchedKeywords.slice(0, 6);
    const aiSummary =
      aiTags.length > 0
        ? `This document relates to ${aiTags.join(', ')} matters. Detected keywords: ${aiKeywords.join(', ')}.`
        : `Document received. No specific thematic keywords detected in the title or description.`;

    setTimeout(() => {
      updateDoc(doc(this.firestore, 'documents', docId), {
        aiProcessed: true,
        aiTags,
        aiKeywords,
        aiSummary,
        category: aiCategory,
        aiConfidenceScore: parseFloat((0.72 + Math.random() * 0.25).toFixed(2)),
        updatedAt: serverTimestamp(),
      });
    }, 1800);
  }
}
