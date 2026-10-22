import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the app root', async () => {
    const fixture = TestBed.createComponent(App);

    // The component template is only rendered by the first change detection
    // pass, so nothing exists in the DOM before detectChanges() runs.
    fixture.detectChanges();
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;

    // TestBed renders the root component's template straight into the test
    // host element (<div id="root0">), so there is no nested <app-root>
    // element to look for. What the test asserts is that the application
    // root template rendered its router outlet and the notification host.
    expect(host.querySelector('router-outlet')).toBeTruthy();
    expect(host.querySelector('app-notification-container')).toBeTruthy();
  });
});
