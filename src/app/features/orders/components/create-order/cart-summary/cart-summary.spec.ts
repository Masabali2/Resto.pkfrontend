import { DecimalPipe } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { CartSummary } from './cart-summary';

describe('CartSummary', () => {
  const item = {
    menuItemId: 'item-1',
    itemName: 'Test Burger',
    unitPrice: 450,
    quantity: 2,
    currency: 'PKR'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DecimalPipe, CartSummary] });
  });

  it('calculates subtotal, tax, and total', () => {
    const fixture = TestBed.createComponent(CartSummary);
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('taxRate', 16);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.detectChanges();

    expect(fixture.componentRef.instance.subtotal()).toBe(900);
    expect(fixture.componentRef.instance.taxAmount()).toBe(144);
    expect(fixture.componentRef.instance.total()).toBe(1044);
    expect(fixture.nativeElement.textContent).toContain('1,044.00');
  });

  it('returns zero tax when tax rate is 0', () => {
    const fixture = TestBed.createComponent(CartSummary);
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('taxRate', 0);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.detectChanges();

    expect(fixture.componentRef.instance.taxAmount()).toBe(0);
    expect(fixture.componentRef.instance.total()).toBe(900);
  });

  it('handles empty cart', () => {
    const fixture = TestBed.createComponent(CartSummary);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('taxRate', 16);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.detectChanges();

    expect(fixture.componentRef.instance.subtotal()).toBe(0);
    expect(fixture.componentRef.instance.total()).toBe(0);
  });

  it('renders currency', () => {
    const fixture = TestBed.createComponent(CartSummary);
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('taxRate', 16);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('PKR');
  });
});

