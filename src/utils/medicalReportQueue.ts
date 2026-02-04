import { MedicalReport, DosageRecommendation, PatientProfile } from '../types/medical';
import { FirestoreService } from '../services/FirestoreService';
import { auth } from '../firebase/config';

export interface QueuedMedicalReport {
  id: string;
  userId: string | null;
  timestamp: number; // When it was queued
  report: MedicalReport;
  recommendation: DosageRecommendation | null;
  patientProfile: PatientProfile | null;
}

const STORAGE_KEY = 'medical_report_queue_v1';
const MAX_QUEUE_SIZE = 100;

/**
 * Enqueue a medical report for async saving to Firestore
 * Returns immediately so UI can display results without delay
 */
export function enqueueMedicalReport(
  report: MedicalReport,
  recommendation: DosageRecommendation | null,
  patientProfile: PatientProfile | null
): QueuedMedicalReport {
  const queue = getQueuedReports();
  
  // Prevent queue from growing too large
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn('Medical report queue is full, removing oldest item');
    queue.shift(); // Remove oldest
  }
  
  const queuedItem: QueuedMedicalReport = {
    id: `mrep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId: auth.currentUser?.uid ?? null,
    timestamp: Date.now(),
    report,
    recommendation,
    patientProfile
  };
  
  queue.push(queuedItem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  
  console.log('Medical report queued for async save:', queuedItem.id);
  return queuedItem;
}

/**
 * Get all queued medical reports
 */
export function getQueuedReports(): QueuedMedicalReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Error reading medical report queue:', error);
    return [];
  }
}

/**
 * Remove a specific report from the queue (after successful save)
 */
export function dequeueMedicalReport(id: string): void {
  const queue = getQueuedReports();
  const remaining = queue.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  console.log('Medical report dequeued:', id);
}

/**
 * Clear the entire queue (use with caution)
 */
export function clearQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log('Medical report queue cleared');
}

/**
 * Process the queue and save items to Firestore
 * Returns the number of successfully saved items
 */
export async function processQueue(): Promise<number> {
  const queue = getQueuedReports();
  if (queue.length === 0) {
    return 0;
  }

  console.log(`Processing ${queue.length} queued medical reports...`);
  let savedCount = 0;
  const userId = auth.currentUser?.uid;

  if (!userId) {
    console.warn('No authenticated user, cannot process queue');
    return 0;
  }

  // Process items one by one to avoid overwhelming Firestore
  for (const item of queue) {
    // Skip items from other users (shouldn't happen, but safety check)
    if (item.userId && item.userId !== userId) {
      continue;
    }

    try {
      console.log(`Saving queued medical report: ${item.id}`);
      
      await FirestoreService.saveMedicalReport(
        userId,
        item.report,
        item.recommendation,
        '',
        item.patientProfile ?? undefined
      );

      // Successfully saved, remove from queue
      dequeueMedicalReport(item.id);
      savedCount++;
      console.log(`Successfully saved and dequeued: ${item.id}`);
      
      // Small delay between saves to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Failed to save queued report ${item.id}:`, error);
      // Keep item in queue for retry
      // Could implement retry count/backoff here if needed
    }
  }

  console.log(`Queue processing complete. Saved ${savedCount} of ${queue.length} items.`);
  
  // Trigger a custom event to notify that queue was processed (for UI updates)
  if (savedCount > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('medicalReportsSaved', { detail: { count: savedCount } }));
  }
  
  return savedCount;
}

/**
 * Process queue after a delay (to allow UI to render first)
 */
export function processQueueAfterDelay(delayMs: number = 1000): void {
  setTimeout(() => {
    void processQueue();
  }, delayMs);
}

/**
 * Schedule periodic queue processing (similar to reportSync)
 */
export function scheduleQueueProcessing(): void {
  // Process immediately if there are items
  void processQueue();
  
  if (typeof window !== 'undefined') {
    // Process when coming online
    window.addEventListener('online', () => {
      console.log('Network online, processing medical report queue...');
      void processQueue();
    });
    
    // Process periodically (every 30 seconds)
    const interval = setInterval(() => {
      void processQueue();
    }, 30000);
    
    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(interval);
    });
  }
}

