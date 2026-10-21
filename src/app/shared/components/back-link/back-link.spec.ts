import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackLink } from './back-link';

describe('BackLink', () => {
  let component: BackLink;
  let fixture: ComponentFixture<BackLink>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackLink],
    }).compileComponents();

    fixture = TestBed.createComponent(BackLink);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
