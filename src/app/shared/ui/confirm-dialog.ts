import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalComponent } from './modal';

@Component({
  selector: 'app-confirm-dialog',
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [title]="title()" [width]="420" (closed)="cancelled.emit()">
      <div class="modal-body">
        <p class="text-muted">{{ message() }}</p>
      </div>
      <footer class="modal-footer">
        <button type="button" class="btn" (click)="cancelled.emit()">Cancel</button>
        <button
          type="button"
          class="btn"
          [class.btn-danger]="danger()"
          [class.btn-primary]="!danger()"
          (click)="confirmed.emit()"
        >
          {{ confirmLabel() }}
        </button>
      </footer>
    </app-modal>
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly danger = input(true);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
