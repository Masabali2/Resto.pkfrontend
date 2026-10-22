import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { DashboardStats } from './dashboard-stats';
import type { DashboardMetric } from '../../models/dashboard-metric.model';

const metrics: DashboardMetric[] = [
  {
    id: 'restaurants',
    label: 'Restaurants',
    value: '2',
    hint: 'In your workspace',
    icon: 'restaurant',
    status: 'ready'
  },
  {
    id: 'menus',
    label: 'Menus',
    value: '—',
    hint: 'Not available right now',
    icon: 'menu',
    status: 'unavailable'
  }
];

describe('DashboardStats', () => {
  let fixture: ComponentFixture<DashboardStats>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardStats]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardStats);
  });

  it('renders the metrics it receives', () => {
    fixture.componentRef.setInput('metrics', metrics);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.stat-card').length).toBe(2);
    expect(element.textContent).toContain('Restaurants');
    expect(element.textContent).toContain('2');
    expect(element.textContent).toContain('Not available right now');
  });

  it('marks unavailable metrics instead of showing a zero count', () => {
    fixture.componentRef.setInput('metrics', metrics);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '.stat-card'
    );

    expect(cards[0].getAttribute('data-status')).toBe('ready');
    expect(cards[1].getAttribute('data-status')).toBe('unavailable');
  });
});
