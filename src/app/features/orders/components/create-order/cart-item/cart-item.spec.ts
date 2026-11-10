import { TestBed } from '@angular/core/testing';
import { CartItem } from './cart-item';

describe('CartItem', () => {
  const baseItem = {
    menuItemId: 'item-1',
    itemName: 'Test Burger',
    unitPrice: 450,
    quantity: 2,
    currency: 'PKR'
  };

  it('renders item name, price, quantity, and line total', () => {
    TestBed.configureTestingModule({ imports: [CartItem] });
    const fixture = TestBed.createComponent(CartItem);
    fixture.componentRef.setInput('item', baseItem);
    fixture.detectChanges();

    const el = fixture.nativeElement;
    expect(el.textContent).toContain('Test Burger');
    expect(el.textContent).toContain('PKR');
    expect(el.textContent).toContain('450.00 each');
    expect(el.textContent).toContain('2');
    expect(el.textContent).toContain('900.00');
  });

  it('emits quantity change on increment', () => {
    TestBed.configureTestingModule({ imports: [CartItem] });
    const fixture = TestBed.createComponent(CartItem);
    fixture.componentRef.setInput('item', baseItem);
    fixture.detectChanges();

    const emitted: number[] = [];
    fixture.componentRef.instance.quantityChange.subscribe(q => emitted.push(q));

    fixture.nativeElement.querySelector('.qty-btn--increment').click();
    expect(emitted).toEqual([3]);
  });

  it('does not decrement below 1', () => {
    TestBed.configureTestingModule({ imports: [CartItem] });
    const fixture = TestBed.createComponent(CartItem);
    fixture.componentRef.setInput('item', { ...baseItem, quantity: 1 });
    fixture.detectChanges();

    const emitted: number[] = [];
    fixture.componentRef.instance.quantityChange.subscribe(q => emitted.push(q));

    const btn = fixture.nativeElement.querySelector('.qty-btn--decrement');
    btn.click();
    expect(btn.disabled).toBe(true);
    expect(emitted).toEqual([]);
  });

  it('emits decrement on decrement click', () => {
    TestBed.configureTestingModule({ imports: [CartItem] });
    const fixture = TestBed.createComponent(CartItem);
    fixture.componentRef.setInput('item', baseItem);
    fixture.detectChanges();

    const emitted: number[] = [];
    fixture.componentRef.instance.quantityChange.subscribe(q => emitted.push(q));

    fixture.nativeElement.querySelector('.qty-btn--decrement').click();
    expect(emitted).toEqual([1]);
  });

  it('emits remove on remove click', () => {
    TestBed.configureTestingModule({ imports: [CartItem] });
    const fixture = TestBed.createComponent(CartItem);
    fixture.componentRef.setInput('item', baseItem);
    fixture.detectChanges();

    const emitted: string[] = [];
    fixture.componentRef.instance.remove.subscribe(id => emitted.push(id));

    fixture.nativeElement.querySelector('.remove-btn').click();
    expect(emitted).toEqual(['item-1']);
  });
});

