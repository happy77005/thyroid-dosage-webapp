import { DataCollectionRecord } from '../types/medical';

export class DataCollectionService {
  private static readonly STORAGE_KEY = 'thyroid_dosage_data';

  /**
   * Store user data collection record
   */
  static async storeDataRecord(record: DataCollectionRecord): Promise<void> {
    try {
      // Get existing records
      const existingRecords = this.getStoredRecords();
      
      // Add new record
      existingRecords.push(record);
      
      // Store back to localStorage (or IndexedDB in production)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingRecords));
      
      console.log('Data collection record stored successfully:', record);
    } catch (error) {
      console.error('Error storing data collection record:', error);
      throw new Error('Failed to store data collection record');
    }
  }

  /**
   * Get all stored data collection records
   */
  static getStoredRecords(): DataCollectionRecord[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving stored records:', error);
      return [];
    }
  }

  /**
   * Export stored data as JSON
   */
  static exportData(): string {
    const records = this.getStoredRecords();
    return JSON.stringify(records, null, 2);
  }

  /**
   * Clear all stored data (for privacy compliance)
   */
  static clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('All data collection records cleared');
  }

  /**
   * Get data collection statistics
   */
  static getDataStats(): {
    totalRecords: number;
    lastUpdated: string | null;
    averageDose: number;
  } {
    const records = this.getStoredRecords();
    
    if (records.length === 0) {
      return {
        totalRecords: 0,
        lastUpdated: null,
        averageDose: 0
      };
    }

    const averageDose = records.reduce((sum, record) => sum + record.recommendedDose, 0) / records.length;
    const lastUpdated = records[records.length - 1]?.timestamp || null;

    return {
      totalRecords: records.length,
      lastUpdated,
      averageDose: Math.round(averageDose)
    };
  }
}
