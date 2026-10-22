import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { SetupProgress } from './setup-progress';
import type { SetupStep } from '../../models/setup-step.model';

const steps: SetupStep[] = [
  {
    id: 'workspace',
    title: 'Create your workspace',
    description: 'Your business hub is set up and ready to use.',
    status: 'completed'
  },
  {
    id: 'restaurant',
    title: 'Add your first restaurant',
    description: 'Add your restaurant name, location and business details.',
    status: 'current',
    actionLabel: 'Start',
    actionRoute: ['/setup/restaurant']
  },
  {
    id: 'website',
    title: 'Customize your website',
    description: 'Choose a look that reflects your restaurant identity.',
    status: 'unavailable'
  }
];

describe('SetupProgress', () => {
  let fixture: ComponentFixture<SetupProgress>;
  let component: SetupProgress;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupProgress]
    }).compileComponents();

    fixture = TestBed.createComponent(SetupProgress);
    component = fixture.componentInstance;
  });

  it('renders every step with its state', () => {
    fixture.componentRef.setInput('steps', steps);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.step').length).toBe(3);
    expect(element.textContent).toContain('Create your workspace');
    expect(element.textContent).toContain('UNAVAILABLE');
    expect(element.textContent).toContain('1 / 3');
  });

  it('emits the step whose action was triggered', () => {
    const emitted: SetupStep[] = [];

    fixture.componentRef.setInput('steps', steps);
    component.stepAction.subscribe(step => emitted.push(step));
    fixture.detectChanges();

    const action = (fixture.nativeElement as HTMLElement).querySelector(
      '.step-action'
    ) as HTMLButtonElement;

    action.click();

    expect(emitted.length).toBe(1);
    expect(emitted[0].id).toBe('restaurant');
  });

  it('does not render an action for steps that are not current', () => {
    fixture.componentRef.setInput(
      'steps',
      steps.map(step => ({ ...step, status: 'upcoming' as const }))
    );
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.step-action')
    ).toBeNull();
  });
});
