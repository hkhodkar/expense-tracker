import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChartConfiguration } from 'chart.js';
import { FinanceStore } from '../../core/services/finance-store';
import { ThemeService } from '../../core/services/theme.service';
import { currentMonthKey, formatMonth, lastMonths, shiftMonth } from '../../core/utils/date.utils';
import {
  budgetProgress,
  calculateTotals,
  inMonth,
  monthlyTotals,
  spendingByCategory,
} from '../../core/utils/finance.utils';
import { formatCompactCurrency, formatCurrency } from '../../core/utils/format.utils';
import { ChartDirective } from '../../shared/directives/chart.directive';
import { IconComponent } from '../../shared/ui/icon';
import { MonthPicker } from '../../shared/ui/month-picker';
import { ProgressBar } from '../../shared/ui/progress-bar';

const TREND_MONTHS = 6;

@Component({
  selector: 'app-dashboard-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    RouterLink,
    ChartDirective,
    IconComponent,
    MonthPicker,
    ProgressBar,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly store = inject(FinanceStore);
  private readonly theme = inject(ThemeService);

  protected readonly month = signal(currentMonthKey());
  protected readonly monthLabel = computed(() => formatMonth(this.month()));

  private readonly monthTransactions = computed(() =>
    inMonth(this.store.transactions(), this.month()),
  );
  protected readonly monthTotals = computed(() => calculateTotals(this.monthTransactions()));
  private readonly previousTotals = computed(() =>
    calculateTotals(inMonth(this.store.transactions(), shiftMonth(this.month(), -1))),
  );

  protected readonly incomeChange = computed(() =>
    percentChange(this.monthTotals().income, this.previousTotals().income),
  );
  protected readonly expenseChange = computed(() =>
    percentChange(this.monthTotals().expenses, this.previousTotals().expenses),
  );
  protected readonly savingsRate = computed(() => {
    const { income, balance } = this.monthTotals();
    return income > 0 ? (balance / income) * 100 : 0;
  });

  protected readonly spending = computed(() =>
    spendingByCategory(this.monthTransactions(), this.store.categories()),
  );

  protected readonly budgets = computed(() =>
    budgetProgress(this.monthTransactions(), this.store.categories())
      .filter((b) => b.budget !== null)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 5),
  );

  protected readonly recent = computed(() => this.store.transactions().slice(0, 6));

  private readonly trend = computed(() => {
    const transactions = this.store.transactions();
    const totals = monthlyTotals(transactions, lastMonths(this.month(), TREND_MONTHS));
    // Hide leading months without any data, but always show at least three
    while (totals.length > 3 && totals[0].income === 0 && totals[0].expenses === 0) {
      totals.shift();
    }
    return totals;
  });

  private readonly chartColors = computed(() =>
    this.theme.isDark()
      ? {
          text: '#939bb3',
          grid: 'rgba(147, 155, 179, 0.15)',
          surface: '#161b2c',
          income: '#34d399',
          expense: '#f87171',
        }
      : {
          text: '#6a7187',
          grid: 'rgba(106, 113, 135, 0.12)',
          surface: '#ffffff',
          income: '#12a06a',
          expense: '#e5484d',
        },
  );

  protected readonly doughnutConfig = computed<ChartConfiguration>(() => {
    const data = this.spending();
    const colors = this.chartColors();
    return {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.category.name),
        datasets: [
          {
            data: data.map((d) => d.amount),
            backgroundColor: data.map((d) => d.category.color),
            borderColor: colors.surface,
            borderWidth: 3,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed as number)}` },
          },
        },
      },
    } as ChartConfiguration<'doughnut'> as ChartConfiguration;
  });

  protected readonly trendConfig = computed<ChartConfiguration>(() => {
    const data = this.trend();
    const colors = this.chartColors();
    return {
      type: 'bar',
      data: {
        labels: data.map((d) => formatMonth(d.month, 'short')),
        datasets: [
          {
            label: 'Income',
            data: data.map((d) => d.income),
            backgroundColor: colors.income,
            borderRadius: 6,
            maxBarThickness: 28,
          },
          {
            label: 'Expenses',
            data: data.map((d) => d.expenses),
            backgroundColor: colors.expense,
            borderRadius: 6,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.text } },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: colors.grid },
            ticks: {
              color: colors.text,
              callback: (value) => formatCompactCurrency(Number(value)),
            },
          },
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: colors.text,
              boxWidth: 10,
              boxHeight: 10,
              useBorderRadius: true,
              borderRadius: 3,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
            },
          },
        },
      },
    } as ChartConfiguration<'bar'> as ChartConfiguration;
  });
}

function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
