import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NewTransaction, Transaction, TransactionType } from '../../core/models/finance.models';
import { FinanceStore } from '../../core/services/finance-store';
import { toIsoDate } from '../../core/utils/date.utils';
import { ModalComponent } from '../../shared/ui/modal';

@Component({
  selector: 'app-transaction-form',
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './transaction-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionForm implements OnInit {
  readonly transaction = input<Transaction | null>(null);
  readonly saved = output<NewTransaction>();
  readonly closed = output<void>();

  private readonly store = inject(FinanceStore);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    type: this.fb.control<TransactionType>('expense'),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    categoryId: ['', Validators.required],
    date: [toIsoDate(new Date()), Validators.required],
    description: ['', [Validators.required, Validators.maxLength(80)]],
  });

  private readonly type = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });

  protected readonly categoryOptions = computed(() =>
    this.type() === 'income' ? this.store.incomeCategories() : this.store.expenseCategories(),
  );

  protected readonly isEdit = computed(() => this.transaction() !== null);

  constructor() {
    // Keep the selected category valid when switching between income and expense
    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const current = this.form.controls.categoryId.value;
      const options = this.categoryOptions();
      if (!options.some((c) => c.id === current)) {
        this.form.controls.categoryId.setValue(options[0]?.id ?? '');
      }
    });
  }

  ngOnInit(): void {
    const transaction = this.transaction();
    if (transaction) {
      const { id: _, ...values } = transaction;
      this.form.setValue(values);
    } else {
      this.form.controls.categoryId.setValue(this.categoryOptions()[0]?.id ?? '');
    }
  }

  protected showError(control: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saved.emit({
      type: value.type,
      amount: value.amount ?? 0,
      categoryId: value.categoryId,
      date: value.date,
      description: value.description.trim(),
    });
  }
}
