import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard | Expense Tracker',
    loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
  },
  {
    path: 'transactions',
    title: 'Transactions | Expense Tracker',
    loadComponent: () =>
      import('./features/transactions/transactions-page').then((m) => m.TransactionsPage),
  },
  {
    path: 'budgets',
    title: 'Budgets | Expense Tracker',
    loadComponent: () => import('./features/budgets/budgets-page').then((m) => m.BudgetsPage),
  },
  { path: '**', redirectTo: 'dashboard' },
];
