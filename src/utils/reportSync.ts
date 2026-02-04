import { MedicalReport, DosageRecommendation } from '../types/medical';
import { FirestoreService } from '../services/FirestoreService';
import { auth } from '../firebase/config';

interface ReportSummaryPayload {
  id: string;
  userId: string | null;
  reportDate: string | null;
  generatedAt: string;
  name: string | null;
  age: number | null;
  weightKg: number | null;
  TSH: number | null;
  T3?: number | null;
  T4?: number | null;
  FT3?: number | null;
  FT4?: number | null;
  recommendedDose: number;
}

const STORAGE_KEY = 'offline_report_queue_v1';

export function buildReportSummary(
  report: MedicalReport,
  recommendation: DosageRecommendation | null,
  profile?: { weightKg: number | null }
): Omit<ReportSummaryPayload, 'id' | 'userId'> {
  const tests = report.tests || {};
  return {
    reportDate: report.patientInfo?.date ?? null,
    generatedAt: new Date().toISOString(),
    name: report.patientInfo?.name ?? null,
    age: report.patientInfo?.age ?? null,
    weightKg: profile?.weightKg ?? null,
    TSH: tests.TSH?.value ?? null,
    T3: tests.T3?.value ?? null,
    T4: tests.T4?.value ?? null,
    FT3: tests.FT3?.value ?? null,
    FT4: tests.FT4?.value ?? null,
    recommendedDose: recommendation?.dosage ?? 0
  };
}

export function queueReportSummary(
  summary: Omit<ReportSummaryPayload, 'id' | 'userId'>
): ReportSummaryPayload {
  const existingRaw = localStorage.getItem(STORAGE_KEY);
  const queue: ReportSummaryPayload[] = existingRaw ? JSON.parse(existingRaw) : [];
  const payload: ReportSummaryPayload = {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId: auth.currentUser?.uid ?? null,
    ...summary
  };
  queue.push(payload);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  return payload;
}

export function getQueuedReports(): ReportSummaryPayload[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeQueuedReport(id: string): void {
  const queue = getQueuedReports();
  const remaining = queue.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}

export async function syncQueuedReports(): Promise<void> {
  const queue = getQueuedReports();
  if (!queue.length) return;

  for (const item of queue) {
    try {
      const userId = item.userId || auth.currentUser?.uid;
      if (!userId) {
        continue;
      }
      await FirestoreService.saveReportSummary(userId, {
        reportDate: item.reportDate,
        generatedAt: item.generatedAt,
        name: item.name,
        age: item.age,
        weightKg: item.weightKg,
        TSH: item.TSH,
        T3: item.T3 ?? null,
        T4: item.T4 ?? null,
        FT3: item.FT3 ?? null,
        FT4: item.FT4 ?? null,
        recommendedDose: item.recommendedDose
      });
      removeQueuedReport(item.id);
    } catch (e) {
      // Keep in queue for retry
    }
  }
}

export function scheduleBackgroundSync(): void {
  void syncQueuedReports();
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => void syncQueuedReports());
    const interval = setInterval(() => void syncQueuedReports(), 60000);
    window.addEventListener('beforeunload', () => clearInterval(interval));
  }
}


