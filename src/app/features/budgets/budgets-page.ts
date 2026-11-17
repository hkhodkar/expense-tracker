import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Category, NewCategory, TransactionType } from '../../core/models/finance.models';
import { FinanceStore } from '../../core/services/finance-store';
import { currentMonthKey } from '../../core/utils/date.utils';
import { budgetProgress, inMonth } from '../../core/utils/finance.utils';
import { roundMoney } from '../../core/utils/format.utils';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { IconComponent } from '../../shared/ui/icon';
import { MonthPicker } from '../../shared/ui/month-picker';
import { ProgressBar } from '../../shared/ui/progress-bar';
import { ToastService } from '../../shared/ui/toast.service';
import { CategoryForm } from './category-form';

@Component({
  selector: 'app-budgets-page',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    IconComponent,
    MonthPicker,
    ProgressBar,
    CategoryForm,
    ConfirmDialog,
  ],
  templateUrl: './budgets-page.html',
  styleUrl: './budgets-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetsPage {
  protected readonly store = inject(FinanceStore);
  private readonly toast = inject(ToastService);

  protected readonly month = signal(currentMonthKey());

  private readonly monthTransactions = computed(() =>
    inMonth(this.store.transactions(), this.month()),
  );

  protected readonly progress = computed(() =>
    budgetProgress(this.monthTransactions(), this.store.categories()),
  );

  protected readonly overBudget = computed(() =>
    this.progress().filter((p) => p.status === 'over'),
  );

  protected readonly summary = computed(() => {
    const budgeted = this.progress().filter((p) => p.budget !== null);
    const totalBudget = budgeted.reduce((sum, p) => sum + (p.budget ?? 0), 0);
    const spent = budgeted.reduce((sum, p) => sum + p.spent, 0);
    return {
      totalBudget,
      spent: roundMoney(spent),
      remaining: roundMoney(totalBudget - spent),
      percent: totalBudget ? (spent / totalBudget) * 100 : 0,
    };
  });

  protected readonly incomeByCategory = computed(() => {
    const totals = new Map<string, number>();
    for (const t of this.monthTransactions()) {
      if (t.type === 'income') {
        totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
      }
    }
    return this.store
      .incomeCategories()
      .map((category) => ({ category, amount: roundMoney(totals.get(category.id) ?? 0) }));
  });

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Category | null>(null);
  protected readonly newType = signal<TransactionType>('expense');
  protected readonly deleting = signal<Category | null>(null);

  protected overBudgetNames(): string {
    return this.overBudget()
      .map((p) => p.category.name)
      .join(', ');
  }

  protected openCreate(type: TransactionType): void {
    this.editing.set(null);
    this.newType.set(type);
    this.formOpen.set(true);
  }

  protected openEdit(category: Category): void {
    this.editing.set(category);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  protected save(value: NewCategory): void {
    const editing = this.editing();
    if (editing) {
      this.store.updateCategory(editing.id, value);
      this.toast.show(`"${value.name}" updated`);
    } else {
      this.store.addCategory(value);
      this.toast.show(`"${value.name}" created`);
    }
    this.closeForm();
  }

  protected requestDelete(category: Category): void {
    if (this.store.isCategoryInUse(category.id)) {
      this.toast.show(
        `"${category.name}" still has transactions. Move or delete them first.`,
        'error',
      );
      return;
    }
    this.deleting.set(category);
  }

  protected confirmDelete(): void {
    const category = this.deleting();
    if (category && this.store.deleteCategory(category.id)) {
      this.toast.show(`"${category.name}" deleted`);
    }
    this.deleting.set(null);
  }
}
