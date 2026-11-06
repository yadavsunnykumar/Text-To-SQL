import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Ask – Text-to-SQL Analyst',
    loadComponent: () =>
      import('./features/query/pages/query-page/query-page.component').then((m) => m.QueryPageComponent),
  },
  {
    path: 'schema',
    title: 'Schema – Text-to-SQL Analyst',
    loadComponent: () =>
      import('./features/schema/pages/schema-page/schema-page.component').then((m) => m.SchemaPageComponent),
  },
  {
    path: 'history',
    title: 'History – Text-to-SQL Analyst',
    loadComponent: () =>
      import('./features/history/pages/history-page/history-page.component').then((m) => m.HistoryPageComponent),
  },
  { path: '**', redirectTo: '' },
];
