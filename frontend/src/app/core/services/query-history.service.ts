import { Injectable, signal } from '@angular/core';

import { HistoryEntry, QueryResponse } from '../models';

export const HISTORY_STORAGE_KEY = 'tts.history.v1';
export const HISTORY_LIMIT = 50;

/** Keeps recent questions in localStorage so they can be re-run later. */
@Injectable({ providedIn: 'root' })
export class QueryHistoryService {
  private readonly _entries = signal<HistoryEntry[]>(this.load());
  readonly entries = this._entries.asReadonly();

  add(response: QueryResponse): HistoryEntry {
    const entry: HistoryEntry = {
      id: this.newId(),
      question: response.question,
      sql: response.sql,
      success: response.success,
      provider: response.provider,
      rowCount: response.row_count,
      createdAt: new Date().toISOString(),
    };
    this._entries.update((list) => [entry, ...list].slice(0, HISTORY_LIMIT));
    this.persist();
    return entry;
  }

  remove(id: string): void {
    this._entries.update((list) => list.filter((e) => e.id !== id));
    this.persist();
  }

  clear(): void {
    this._entries.set([]);
    this.persist();
  }

  private newId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private load(): HistoryEntry[] {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this._entries()));
    } catch {
      // Storage may be full or unavailable (private mode) - history just won't persist.
    }
  }
}
