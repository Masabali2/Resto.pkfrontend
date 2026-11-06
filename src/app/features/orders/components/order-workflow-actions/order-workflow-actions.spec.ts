import { TestBed } from '@angular/core/testing';
import { OrderWorkflowActions } from './order-workflow-actions';

describe('OrderWorkflowActions', () => {
  it('hides cancellation when Order.Cancel is not granted', async () => {
    await TestBed.configureTestingModule({
      imports: [OrderWorkflowActions]
    }).compileComponents();

    const fixture = TestBed.createComponent(OrderWorkflowActions);
    fixture.componentRef.setInput('status', 'New');
    fixture.componentRef.setInput('allowCancellation', false);
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.workflow-action')
    ) as HTMLButtonElement[];

    expect(buttons.map(button => button.textContent?.trim())).toEqual(['Mark as Confirmed']);
  });

  it('offers cancellation when the caller has Order.Cancel', async () => {
    await TestBed.configureTestingModule({
      imports: [OrderWorkflowActions]
    }).compileComponents();

    const fixture = TestBed.createComponent(OrderWorkflowActions);
    fixture.componentRef.setInput('status', 'New');
    fixture.componentRef.setInput('allowCancellation', true);
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('.workflow-action')
    ) as HTMLButtonElement[];

    expect(buttons.map(button => button.textContent?.trim())).toEqual([
      'Mark as Confirmed',
      'Cancel order'
    ]);
  });
});