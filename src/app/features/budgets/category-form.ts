import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Category, NewCategory, TransactionType } from '../../core/models/finance.models';
import { FinanceStore } from '../../core/services/finance-store';
import { ModalComponent } from '../../shared/ui/modal';

export const CATEGORY_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f97316',
  '#eab308',
  '#06b6d4',
  '#ec4899',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#64748b',
];

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule, ModalComponent],
  templateUrl: './category-form.html',
  styleUrl: './category-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryForm implements OnInit {
  readonly category = input<Category | null>(null);
  readonly defaultType = input<TransactionType>('expense');
  readonly saved = output<NewCategory>();
  readonly closed = output<void>();

  private readonly store = inject(FinanceStore);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly colors = CATEGORY_COLORS;
  protected readonly isEdit = computed(() => this.category() !== null);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(30), this.uniqueName()]],
    type: this.fb.control<TransactionType>('expense'),
    color: [CATEGORY_COLORS[0]],
    budget: this.fb.control<number | null>(null, Validators.min(0)),
  });

  protected readonly type = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  protected readonly color = toSignal(this.form.controls.color.valueChanges, {
    initialValue: this.form.controls.color.value,
  });

  ngOnInit(): void {
    const category = this.category();
    if (category) {
      this.form.setValue({
        name: category.name,
        type: category.type,
        color: category.color,
        budget: category.budget,
      });
      // moving a category between income and expense would break existing transactions
      this.form.controls.type.disable();
    } else {
      const used = new Set(this.store.categories().map((c) => c.color));
      this.form.patchValue({
        type: this.defaultType(),
        color: CATEGORY_COLORS.find((c) => !used.has(c)) ?? CATEGORY_COLORS[0],
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, type, color, budget } = this.form.getRawValue();
    this.saved.emit({
      name: name.trim(),
      type,
      color,
      budget: type === 'expense' && budget ? budget : null,
    });
  }

  private uniqueName(): ValidatorFn {
    return (control: AbstractControl<string>): ValidationErrors | null => {
      const name = control.value?.trim().toLowerCase();
      if (!name) return null;
      const taken = this.store
        .categories()
        .some((c) => c.name.toLowerCase() === name && c.id !== this.category()?.id);
      return taken ? { taken: true } : null;
    };
  }
}
