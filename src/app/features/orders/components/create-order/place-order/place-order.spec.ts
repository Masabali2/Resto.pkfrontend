import { DecimalPipe } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { PlaceOrder } from './place-order';
import type { CustomerInformationData } from '../customer-information/customer-information';

describe('PlaceOrder', () => {
  const customer: CustomerInformationData = {
    customerName: 'John Doe',
    phone: '+923001234567',
    email: 'john@example.com',
    specialInstructions: 'No onions please'
  };

  const items = [
    { menuItemId: 'item-1', itemName: 'Test Burger', unitPrice: 450, quantity: 2, currency: 'PKR' }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [DecimalPipe, PlaceOrder] });
  });

  it('renders review summary with totals', () => {
    const fixture = TestBed.createComponent(PlaceOrder);
    fixture.componentRef.setInput('customer', customer);
    fixture.componentRef.setInput('orderType', 'Pickup');
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('subtotal', 900);
    fixture.componentRef.setInput('taxAmount', 144);
    fixture.componentRef.setInput('totalAmount', 1044);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.componentRef.setInput('paymentMethod', 'Cash');
    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Review your order');
    expect(el.textContent).toContain('John Doe');
    expect(el.textContent).toContain('Pickup');
    expect(el.textContent).toContain('Cash');
    expect(el.textContent).toContain('Test Burger');
    expect(el.textContent).toContain('1,044.00');
  });

  it('disables place order when invalid', () => {
    const fixture = TestBed.createComponent(PlaceOrder);
    fixture.componentRef.setInput('customer', { ...customer, customerName: '' });
    fixture.componentRef.setInput('orderType', null);
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('subtotal', 0);
    fixture.componentRef.setInput('taxAmount', 0);
    fixture.componentRef.setInput('totalAmount', 0);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.componentRef.setInput('paymentMethod', 'Cash');
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.place-btn');
    expect(btn.disabled).toBe(true);
  });

  it('shows loading state while submitting', () => {
    const fixture = TestBed.createComponent(PlaceOrder);
    fixture.componentRef.setInput('customer', customer);
    fixture.componentRef.setInput('orderType', 'Pickup');
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('subtotal', 900);
    fixture.componentRef.setInput('taxAmount', 144);
    fixture.componentRef.setInput('totalAmount', 1044);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.componentRef.setInput('paymentMethod', 'Cash');
    fixture.componentRef.setInput('submitting', true);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.place-btn');
    expect(btn.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Placing order…');
  });

  it('shows success state after order placed', () => {
    const fixture = TestBed.createComponent(PlaceOrder);
    fixture.componentRef.setInput('placedOrder', {
      id: 'order-1',
      orderNumber: 'ORD-001',
      status: 'New',
      orderType: 'Pickup',
      customerName: 'John Doe',
      customerPhone: '+923001234567',
      customerEmail: 'john@example.com',
      subtotal: 900,
      discountAmount: 0,
      taxAmount: 144,
      totalAmount: 1044,
      currency: 'PKR',
      specialInstructions: 'No onions please',
      createdAt: '2026-11-10T00:00:00Z',
      completedAt: null,
      cancelledAt: null,
      items: []
    });
    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Order placed');
    expect(el.textContent).toContain('ORD-001');
  });

  it('shows error banner when error is set', () => {
    const fixture = TestBed.createComponent(PlaceOrder);
    fixture.componentRef.setInput('customer', customer);
    fixture.componentRef.setInput('orderType', 'Pickup');
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('subtotal', 900);
    fixture.componentRef.setInput('taxAmount', 144);
    fixture.componentRef.setInput('totalAmount', 1044);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.componentRef.setInput('paymentMethod', 'Cash');
    fixture.componentRef.setInput('error', 'Restaurant not accepting orders.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Restaurant not accepting orders.');
  });

  it('emits placeOrder when button clicked and valid', () => {
    const fixture = TestBed.createComponent(PlaceOrder);
    fixture.componentRef.setInput('customer', customer);
    fixture.componentRef.setInput('orderType', 'Pickup');
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('subtotal', 900);
    fixture.componentRef.setInput('taxAmount', 144);
    fixture.componentRef.setInput('totalAmount', 1044);
    fixture.componentRef.setInput('currency', 'PKR');
    fixture.componentRef.setInput('paymentMethod', 'Cash');
    fixture.detectChanges();

    let emitted = false;
    fixture.componentRef.instance.placeOrder.subscribe(() => { emitted = true; });

    fixture.nativeElement.querySelector('.place-btn').click();
    expect(emitted).toBe(true);
  });
});

