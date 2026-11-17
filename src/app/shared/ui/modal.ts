import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from './icon';

@Component({
  selector: 'app-modal',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="backdrop" (click)="closed.emit()">
      <div
        class="modal"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        [style.max-width.px]="width()"
        (click)="$event.stopPropagation()"
      >
        <header class="modal-header">
          <h2>{{ title() }}</h2>
          <button type="button" class="icon-btn" aria-label="Close" (click)="closed.emit()">
            <app-icon name="x" />
          </button>
        </header>
        <ng-content />
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgba(10, 14, 26, 0.55);
      backdrop-filter: blur(2px);
      animation: fade-in 0.15s ease-out;
    }

    .modal {
      width: 100%;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      box-shadow: var(--shadow-lg);
      animation: pop-in 0.18s ease-out;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px 0;

      h2 {
        font-size: 18px;
      }
    }

    :host ::ng-deep .modal-body {
      padding: 20px;
    }

    :host ::ng-deep .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 16px 20px;
      border-top: 1px solid var(--border);
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }

    @keyframes pop-in {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.98);
      }
    }
  `,
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly width = input(520);
  readonly closed = output<void>();
}
