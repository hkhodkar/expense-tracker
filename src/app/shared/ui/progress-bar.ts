import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BudgetStatus } from '../../core/utils/finance.utils';

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'width()',
  },
  template: `<div class="fill" [class]="status()" [style.width.%]="width()"></div>`,
  styles: `
    :host {
      display: block;
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--surface-muted);
    }

    .fill {
      height: 100%;
      border-radius: inherit;
      background: var(--success);
      transition: width 0.4s ease;

      &.warning {
        background: var(--warning);
      }

      &.over {
        background: var(--danger);
      }

      &.none {
        background: var(--text-muted);
      }
    }
  `,
})
export class ProgressBar {
  readonly percent = input.required<number>();
  readonly status = input<BudgetStatus>('ok');

  protected readonly width = computed(() => Math.round(Math.min(100, Math.max(0, this.percent()))));
}
