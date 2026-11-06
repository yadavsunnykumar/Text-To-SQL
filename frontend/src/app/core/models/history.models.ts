export interface HistoryEntry {
  id: string;
  question: string;
  sql: string | null;
  success: boolean;
  provider: string;
  rowCount: number;
  createdAt: string; // ISO date
}
