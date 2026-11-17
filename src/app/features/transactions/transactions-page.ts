import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';
import {
  EMPTY_FILTERS,
  NewTransaction,
  Transaction,
  TransactionFilters,
} from '../../core/models/finance.models';
import { FinanceStore } from '../../core/services/finance-store';
import { parseTransactionsCsv, transactionsToCsv } from '../../core/utils/csv.utils';
import { toIsoDate } from '../../core/utils/date.utils';
import { calculateTotals, filterTransactions } from '../../core/utils/finance.utils';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { IconComponent } from '../../shared/ui/icon';
import { ToastService } from '../../shared/ui/toast.service';
import { TransactionForm } from './transaction-form';

const PAGE_SIZE = 15;

@Component({
  selector: 'app-transactions-page',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    DatePipe,
    IconComponent,
    TransactionForm,
    ConfirmDialog,
  ],
  templateUrl: './transactions-page.html',
  styleUrl: './transactions-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage {
  protected readonly store = inject(FinanceStore);
  private readonly toast = inject(ToastService);

  protected readonly filterForm = inject(NonNullableFormBuilder).group<TransactionFilters>({
    ...EMPTY_FILTERS,
  });

  private readonly filters = toSignal(
    this.filterForm.valueChanges.pipe(map(() => this.filterForm.getRawValue())),
    { initialValue: this.filterForm.getRawValue() },
  );

  protected readonly filterCategories = computed(() => {
    const type = this.filters().type;
    const categories = this.store.categories();
    return type === 'all' ? categories : categories.filter((c) => c.type === type);
  });

  protected readonly filtered = computed(() =>
    filterTransactions(this.store.transactions(), this.filters(), this.store.categoryMap()),
  );
  protected readonly filteredTotals = computed(() => calculateTotals(this.filtered()));
  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!(f.search || f.from || f.to || f.type !== 'all' || f.categoryId !== 'all');
  });

  // Jump back to the first page whenever the filters change
  protected readonly page = linkedSignal({ source: this.filters, computation: () => 1 });
  protected readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)),
  );
  protected readonly pageItems = computed(() => {
    const page = Math.min(this.page(), this.pageCount());
    const start = (page - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });
  protected readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (!total) return '0 results';
    const start = (Math.min(this.page(), this.pageCount()) - 1) * PAGE_SIZE;
    return `${start + 1}-${start + this.pageItems().length} of ${total}`;
  });

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Transaction | null>(null);
  protected readonly deleting = signal<Transaction | null>(null);

  protected openCreate(): void {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(transaction: Transaction): void {
    this.editing.set(transaction);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  protected save(value: NewTransaction): void {
    const editing = this.editing();
    if (editing) {
      this.store.updateTransaction(editing.id, value);
      this.toast.show('Transaction updated');
    } else {
      this.store.addTransaction(value);
      this.toast.show('Transaction added');
    }
    this.closeForm();
  }

  protected confirmDelete(): void {
    const transaction = this.deleting();
    if (transaction) {
      this.store.deleteTransaction(transaction.id);
      this.toast.show('Transaction deleted');
    }
    this.deleting.set(null);
  }

  protected clearFilters(): void {
    this.filterForm.reset();
  }

  protected exportCsv(): void {
    const transactions = this.filtered();
    if (!transactions.length) {
      this.toast.show('Nothing to export', 'info');
      return;
    }
    const csv = transactionsToCsv(transactions, this.store.categoryMap());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${toIsoDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.toast.show(
      `Exported ${plural(transactions.length, this.hasFilters() ? 'filtered transaction' : 'transaction')}`,
    );
  }

  protected async importCsv(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow picking the same file again
    if (!file) return;

    const { rows, errors } = parseTransactionsCsv(await file.text());
    if (!rows.length) {
      this.toast.show(errors[0] ?? 'No transactions found in this file', 'error', 6000);
      return;
    }

    const result = this.store.importRows(rows);
    const details = [
      result.duplicates && `${plural(result.duplicates, 'duplicate')} skipped`,
      errors.length && `${plural(errors.length, 'invalid row')} ignored`,
      result.newCategories && plural(result.newCategories, 'new category', 'new categories'),
    ].filter(Boolean);
    this.toast.show(
      `Imported ${plural(result.added, 'transaction')}${details.length ? ` (${details.join(', ')})` : ''}`,
      'success',
      6000,
    );
    if (errors.length) {
      console.warn('CSV import issues:', errors);
    }
  }

  protected goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.pageCount()));
  }
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
