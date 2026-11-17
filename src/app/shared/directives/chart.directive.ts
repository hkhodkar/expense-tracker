import { DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';

// Register only what we use to keep the bundle small
Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip,
);

@Directive({ selector: 'canvas[appChart]' })
export class ChartDirective {
  readonly config = input.required<ChartConfiguration>({ alias: 'appChart' });

  private readonly canvas = inject<ElementRef<HTMLCanvasElement>>(ElementRef).nativeElement;
  private chart?: Chart;

  constructor() {
    effect(() => {
      const config = this.config();
      this.chart?.destroy();
      this.chart = new Chart(this.canvas, config);
    });

    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }
}
