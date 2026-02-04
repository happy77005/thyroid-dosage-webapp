/**
 * Monthly limit utilities with per-user tracking
 */

const MONTHLY_LIMIT_KEY = 'thyroid_monthly_manual_entries_v1';
const MAX_ENTRIES_PER_MONTH = 10;

interface MonthlyEntryInfo {
  count: number;
  lastEntryTime?: string;
}

interface StoredUserMonthlyData {
  registrationDate?: string;
  entries: Record<string, MonthlyEntryInfo>;
}

interface MonthlyLimitStatus {
  allowed: boolean;
  remainingEntries: number;
  lastEntryTime?: string;
  registrationDate?: string;
  cycleStart: string;
  cycleEnd: string;
}

type StoredMonthlyMap = Record<string, StoredUserMonthlyData>;

export class DailyLimitManager {
  /**
   * Check if a user can create another entry in the current month
   */
  static canMakeEntry(userId?: string | null, registrationDate?: string | null): MonthlyLimitStatus {
    if (!userId) {
      return {
        allowed: false,
        remainingEntries: 0,
        cycleStart: new Date().toISOString(),
        cycleEnd: new Date().toISOString()
      };
    }

    const storage = this.getStoredMonthlyMap();
    const now = new Date();
    const monthKey = this.buildMonthKey(now);
    const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const userData: StoredUserMonthlyData = storage[userId] || { entries: {} };

    if (!userData.registrationDate) {
      const normalizedRegistration = registrationDate
        ? new Date(registrationDate).toISOString()
        : new Date().toISOString();
      userData.registrationDate = normalizedRegistration;
      storage[userId] = userData;
      this.saveMonthlyMap(storage);
    }

    const entry = userData.entries[monthKey];
    const count = entry?.count || 0;
    const remainingEntries = Math.max(0, MAX_ENTRIES_PER_MONTH - count);

    return {
      allowed: count < MAX_ENTRIES_PER_MONTH,
      remainingEntries,
      lastEntryTime: entry?.lastEntryTime,
      registrationDate: userData.registrationDate,
      cycleStart: cycleStart.toISOString(),
      cycleEnd: cycleEnd.toISOString()
    };
  }

  /**
   * Record a new manual entry for the current month
   */
  static recordEntry(userId?: string | null): void {
    if (!userId) return;

    const storage = this.getStoredMonthlyMap();
    const now = new Date();
    const monthKey = this.buildMonthKey(now);

    const userData: StoredUserMonthlyData = storage[userId] || { entries: {} };
    const entry = userData.entries[monthKey] || { count: 0 };
    entry.count += 1;
    entry.lastEntryTime = now.toISOString();
    userData.entries[monthKey] = entry;
    storage[userId] = userData;

    this.saveMonthlyMap(storage);
  }

  /**
   * Helper to reset monthly data (testing or admin)
   */
  static resetMonthlyLimit(userId?: string | null): void {
    if (!userId) {
      localStorage.removeItem(MONTHLY_LIMIT_KEY);
      return;
    }
    const storage = this.getStoredMonthlyMap();
    delete storage[userId];
    this.saveMonthlyMap(storage);
  }

  private static buildMonthKey(date: Date): string {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  private static getStoredMonthlyMap(): StoredMonthlyMap {
    try {
      const stored = localStorage.getItem(MONTHLY_LIMIT_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  private static saveMonthlyMap(map: StoredMonthlyMap): void {
    try {
      localStorage.setItem(MONTHLY_LIMIT_KEY, JSON.stringify(map));
    } catch {
      // Ignore storage errors
    }
  }
}
