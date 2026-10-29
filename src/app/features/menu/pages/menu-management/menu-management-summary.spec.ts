import { TestBed } from '@angular/core/testing';
import { MenuManagementSummary } from './menu-management-summary';
import type { MenuItemSummaryDto } from '../models/menu-item.model';

describe('MenuManagementSummary', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MenuManagementSummary]
    });
  });

  it('renders four stat cards from the summary input', () => {
    const fixture = TestBed.createComponent(MenuManagementSummary);
    fixture.componentRef.setInput('summary', {
      totalItems: 100,
      availableItems: 60,
      unavailableItems: 40,
      categoryCount: 10
    } as MenuItemSummaryDto);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.summary-card');
    expect(cards.length).toBe(4);

    const labels = Array.from(cards).map(c => c.querySelector('.summary-card__label')!.textContent!.trim());
    expect(labels).toEqual(['Total Items', 'Available', 'Out of Stock', 'Categories']);

    const values = Array.from(cards).map(c => c.querySelector('.summary-card__value')!.textContent!.trim());
    expect(values).toEqual(['100', '60', '40', '10']);
  });

  it('falls back to totalCount input when summary is null', () => {
    const fixture = TestBed.createComponent(MenuManagementSummary);
    fixture.componentRef.setInput('summary', null);
    fixture.componentRef.setInput('totalCount', 7);
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.summary-card__value')!.textContent!.trim();
    expect(value).toBe('7');
  });
});
