import { TestBed } from '@angular/core/testing';
import { OrderTypeSelector } from './order-type-selector';

describe('OrderTypeSelector', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrderTypeSelector] });
  });

  it('renders available order types and highlights selected', () => {
    const fixture = TestBed.createComponent(OrderTypeSelector);
    fixture.componentRef.setInput('orderTypes', ['Pickup', 'DineIn', 'Delivery']);
    fixture.componentRef.setInput('selected', 'Pickup');
    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Pickup');
    expect(el.textContent).toContain('Dine In');
    expect(el.textContent).toContain('Delivery');

    const selected = el.querySelector('.order-type__option--selected');
    expect(selected.textContent).toContain('Pickup');
  });

  it('emits selected order type', () => {
    const fixture = TestBed.createComponent(OrderTypeSelector);
    fixture.componentRef.setInput('orderTypes', ['Pickup', 'Delivery']);
    fixture.componentRef.setInput('selected', null);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentRef.instance.orderTypeChange.subscribe(t => emitted.push(t));

    const buttons = fixture.nativeElement.querySelectorAll('.order-type__option');
    buttons[1].click();
    expect(emitted).toEqual(['Delivery']);
  });

  it('shows error when no valid selection after touch', () => {
    const fixture = TestBed.createComponent(OrderTypeSelector);
    fixture.componentRef.setInput('orderTypes', ['Pickup', 'DineIn']);
    fixture.componentRef.setInput('selected', null);
    fixture.detectChanges();

    const instance = fixture.componentRef.instance;
    instance.select('Pickup');
    fixture.componentRef.setInput('selected', 'Pickup');
    fixture.detectChanges();

    expect(fixture.componentRef.instance.isValid()).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Please select a valid order type.');
  });

  it('filters only supported order types', () => {
    const fixture = TestBed.createComponent(OrderTypeSelector);
    fixture.componentRef.setInput('orderTypes', ['Pickup', 'DineIn', 'Delivery', 'Unknown']);
    fixture.componentRef.setInput('selected', null);
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.order-type__option');
    expect(options.length).toBe(3);
  });
});

