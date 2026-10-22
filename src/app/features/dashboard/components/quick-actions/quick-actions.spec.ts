import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QuickActions } from './quick-actions';
import type { QuickAction } from '../../models/quick-action.model';

const actions: QuickAction[] = [
  {
    id: 'restaurant',
    label: 'Set up a restaurant',
    description: 'Add your restaurant details.',
    icon: 'restaurant',
    route: ['/setup/restaurant']
  },
  {
    id: 'menu',
    label: 'Manage your menus',
    description: 'Add dishes and prices.',
    icon: 'menu',
    route: ['/menus'],
    disabledReason: 'Add a restaurant first.'
  }
];

describe('QuickActions', () => {
  let fixture: ComponentFixture<QuickActions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickActions],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(QuickActions);
  });

  it('links available actions to their route', () => {
    fixture.componentRef.setInput('actions', actions);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector(
      'a.action-card'
    ) as HTMLAnchorElement;

    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toContain('/setup/restaurant');
  });

  it('renders unavailable actions as disabled and explains why', () => {
    fixture.componentRef.setInput('actions', actions);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const disabled = element.querySelector('.action-card.is-disabled');

    expect(disabled).toBeTruthy();
    expect(element.textContent).toContain('Add a restaurant first.');
    expect(element.querySelectorAll('a.action-card').length).toBe(1);
  });
});
