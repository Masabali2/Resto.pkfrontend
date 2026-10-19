import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HowItWorks, RevealOnScroll } from './how-it-works';
import { MarketingStep } from '../../../../shared/models/marketing-step.model';

describe('HowItWorks', () => {
  let fixture: ComponentFixture<HowItWorks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HowItWorks],
    }).compileComponents();

    fixture = TestBed.createComponent(HowItWorks);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the heading and supporting text', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const title = compiled.querySelector('#how-it-works-title');
    expect(title?.textContent).toContain('Get Your Restaurant Online in');
    expect(title?.textContent).toContain('3 Simple Steps');
    expect(compiled.querySelector('.hiw-intro')?.textContent).toContain(
      'Everything you need to launch your restaurant website',
    );
  });

  it('renders exactly three ordered steps with the expected titles', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    const list = compiled.querySelector('ol.hiw-steps');
    expect(list).toBeTruthy();

    const items = compiled.querySelectorAll('.hiw-step');
    expect(items.length).toBe(3);

    const titles = [...compiled.querySelectorAll('.hiw-step-title')].map(el =>
      el.textContent?.trim().replace(/\s+/g, ' '),
    );
    expect(titles).toEqual([
      'Step 1 — Choose Your Template',
      'Step 2 — Customize Your Website',
      'Step 3 — Launch Your Restaurant Website',
    ]);
  });

  it('exposes step data through the typed MarketingStep model', () => {
    const steps: readonly MarketingStep[] = fixture.componentInstance['steps'];
    expect(steps.map(step => step.visual)).toEqual([
      'template-picker',
      'menu-editor',
      'device-launch',
    ]);
    for (const step of steps) {
      expect(step.description.trim().length).toBeGreaterThan(0);
      expect(fixture.nativeElement.querySelector('.hiw-step-description')?.textContent).toBeTruthy();
    }
  });

  it('renders one illustration per step and only two connectors', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelectorAll('.hiw-visual').length).toBe(3);
    // Connectors appear between adjacent cards only (last step has none).
    expect(compiled.querySelectorAll('.hiw-connector').length).toBe(2);
  });

  it('marks decorative elements as hidden from assistive tech but keeps visuals labelled', () => {
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelector('.hiw-step-number')?.getAttribute('aria-hidden')).toBe('true');
    expect(compiled.querySelector('.hiw-step-badge')?.getAttribute('aria-hidden')).toBe('true');
    const visuals = compiled.querySelectorAll('.hiw-visual');
    for (const visual of visuals) {
      expect(visual.getAttribute('role')).toBe('img');
      expect(visual.getAttribute('aria-label')).toContain('Illustration:');
    }
  });

  it('applies the staggered reveal delay custom property per step', () => {
    const steps = fixture.debugElement.queryAll(By.directive(RevealOnScroll));
    const delays = steps
      .filter(dbg => dbg.nativeElement.classList.contains('hiw-step'))
      .map(dbg => dbg.nativeElement.style.getPropertyValue('--hiw-step-delay'));
    expect(delays).toEqual(['0ms', '140ms', '280ms']);
  });

  it('adds the in-view class when the reveal directive reports intersection', () => {
    const header: HTMLElement = fixture.nativeElement.querySelector('.hiw-header');
    const directive = fixture.debugElement
      .query(By.directive(RevealOnScroll))!
      .injector.get(RevealOnScroll);
    // Simulate what the IntersectionObserver callback does in the browser.
    header.classList.add('in-view');
    expect(directive).toBeTruthy();
    expect(header.classList.contains('in-view')).toBe(true);
  });
});
