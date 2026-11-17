import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { currentMonthKey, formatMonth, shiftMonth } from '../../core/utils/date.utils';
import { IconComponent } from './icon';

@Component({
  selector: 'app-month-picker',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="month-picker">
      <button type="button" class="icon-btn" aria-label="Previous month" (click)="move(-1)">
        <app-icon name="chevron-left" />
      </button>
      <span class="label">{{ label() }}</span>
      <button
        type="button"
        class="icon-btn"
        aria-label="Next month"
        [disabled]="isCurrentMonth()"
        (click)="move(1)"
      >
        <app-icon name="chevron-right" />
      </button>
    </div>
  `,
  styles: `
    .month-picker {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--surface);
    }

    .label {
      min-width: 128px;
      font-weight: 600;
      text-align: center;
    }
  `,
})
export class MonthPicker {
  readonly month = model.required<string>();

  protected readonly label = computed(() => formatMonth(this.month()));
  protected readonly isCurrentMonth = computed(() => this.month() >= currentMonthKey());

  protected move(delta: number): void {
    this.month.update((m) => shiftMonth(m, delta));
  }
}
