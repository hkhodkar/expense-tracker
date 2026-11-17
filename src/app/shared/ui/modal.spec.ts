import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalComponent } from './modal';

@Component({
  imports: [ModalComponent],
  template: `<app-modal title="Test" (closed)="closedCount = closedCount + 1"><input /></app-modal>`,
})
class Host {
  closedCount = 0;
}

function setup() {
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  const el: HTMLElement = fixture.nativeElement;
  return {
    host: fixture.componentInstance,
    backdrop: el.querySelector('.backdrop') as HTMLElement,
    input: el.querySelector('input') as HTMLInputElement,
  };
}

describe('ModalComponent', () => {
  it('closes on a click on the backdrop', () => {
    const { host, backdrop } = setup();
    backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(host.closedCount).toBe(1);
  });

  it('stays open when a drag starts inside the dialog and ends on the backdrop', () => {
    const { host, backdrop, input } = setup();
    input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(host.closedCount).toBe(0);
  });

  it('stays open on clicks inside the dialog', () => {
    const { host, input } = setup();
    input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(host.closedCount).toBe(0);
  });
});
