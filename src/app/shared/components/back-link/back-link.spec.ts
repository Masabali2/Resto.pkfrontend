import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BackLink } from './back-link';

describe('BackLink', () => {
  let component: BackLink;
  let fixture: ComponentFixture<BackLink>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackLink],
      // RouterLink injects ActivatedRoute, so the router has to be provided
      // for the component to be constructible in a test.
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(BackLink);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
