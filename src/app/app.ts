import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FinanceStore } from './core/services/finance-store';
import { ThemeService } from './core/services/theme.service';
import { ConfirmDialog } from './shared/ui/confirm-dialog';
import { IconComponent, IconName } from './shared/ui/icon';
import { ToastContainer } from './shared/ui/toast-container';
import { ToastService } from './shared/ui/toast.service';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    IconComponent,
    ToastContainer,
    ConfirmDialog,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly theme = inject(ThemeService);
  private readonly store = inject(FinanceStore);
  private readonly toast = inject(ToastService);

  protected readonly confirmReset = signal(false);

  protected readonly navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/transactions', label: 'Transactions', icon: 'transactions' },
    { path: '/budgets', label: 'Budgets', icon: 'budget' },
  ];

  protected resetDemoData(): void {
    this.store.resetDemoData();
    this.confirmReset.set(false);
    this.toast.show('Demo data restored');
  }
}
