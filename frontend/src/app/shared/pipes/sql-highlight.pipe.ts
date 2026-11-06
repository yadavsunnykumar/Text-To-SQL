import { Pipe, PipeTransform } from '@angular/core';

const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'AS', 'ON', 'JOIN', 'INNER', 'LEFT',
  'RIGHT', 'FULL', 'OUTER', 'CROSS', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT',
  'UNION', 'ALL', 'WITH', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'BETWEEN', 'LIKE',
  'EXISTS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'COALESCE', 'CAST', 'OVER', 'PARTITION',
];

const TOKEN_RE = new RegExp(
  `('(?:[^']|'')*')|\\b(${KEYWORDS.join('|')})\\b|\\b(\\d+(?:\\.\\d+)?)\\b`,
  'gi',
);

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Returns HTML with <span class="kw|str|num"> wrappers. Input is HTML-escaped first,
 * and Angular's [innerHTML] sanitizer still runs on the output.
 */
@Pipe({ name: 'sqlHighlight' })
export class SqlHighlightPipe implements PipeTransform {
  transform(sql: string | null | undefined): string {
    if (!sql) {
      return '';
    }
    return escapeHtml(sql).replace(TOKEN_RE, (match, str?: string, kw?: string, num?: string) => {
      if (str) return `<span class="str">${str}</span>`;
      if (kw) return `<span class="kw">${kw.toUpperCase()}</span>`;
      if (num) return `<span class="num">${num}</span>`;
      return match;
    });
  }
}
