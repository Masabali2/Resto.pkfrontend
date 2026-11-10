import { DecimalPipe } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { OrderCart } from './order-cart';

describe('OrderCart', () => {
  const items = [
    { menuItemId: 'item-1', itemName: 'Test Burger', unitPrice: 450, quantity: 2, currency: 'PKR' },
    { menuItemId: 'item-2', itemName: 'Fries', unitPrice: 200, quantity: 1, currency: 'PKR' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DecimalPipe, OrderCart] });
  });

  it('renders each cart item and item count', () => {
    const fixture = TestBed.createComponent(OrderCart);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('taxRate', 16);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Test Burger');
    expect(el.textContent).toContain('Fries');
    expect(el.textContent).toContain('3 items');
    expect(el.querySelectorAll('.cart-item')).toHaveLength(2);
  });

  it('shows empty cart state when no items', () => {
    const fixture = TestBed.createComponent(OrderCart);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('taxRate', 16);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Your cart is empty');
    expect(el.querySelectorAll('.cart-item')).toHaveLength(0);
  });

  it('emits quantity change', () => {
    const fixture = TestBed.createComponent(OrderCart);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('taxRate', 16);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.detectChanges();

    const emitted: { menuItemId: string; quantity: number }[] = [];
    fixture.componentRef.instance.quantityChange.subscribe(e => emitted.push(e));

    const decrementBtns = fixture.nativeElement.querySelectorAll('.qty-btn--decrement');
    decrementBtns[0].click();
    expect(emitted).toEqual([{ menuItemId: 'item-1', quantity: 1 }]);
  });

  it('emits remove', () => {
    const fixture = TestBed.createComponent(OrderCart);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('taxRate', 16);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentRef.instance.remove.subscribe(id => emitted.push(id));

    const removeBtns = fixture.nativeElement.querySelectorAll('.remove-btn');
    removeBtns[1].click();
    expect(emitted).toEqual(['item-2']);
  });
});

