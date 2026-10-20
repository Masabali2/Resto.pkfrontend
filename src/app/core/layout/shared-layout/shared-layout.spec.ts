import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { SharedLayout } from './shared-layout';

@Component({ selector: 'app-navbar', template: '' })
class NavbarStub {
  readonly menuClick = { subscribe: () => ({ unsubscribe() {} }) };
}

@Component({ selector: 'app-sidebar', template: '' })
class SidebarStub {}

@Component({ selector: 'app-empty', template: '<p>empty</p>' })
class EmptyPage {}

describe('SharedLayout', () => {
  let fixture;
  let component: SharedLayout;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedLayout],
      providers: [
        provideRouter([{ path: '', component: EmptyPage }])
      ]
    })
      .overrideComponent(SharedLayout, {
        remove: { imports: [] },
        add: { imports: [NavbarStub, SidebarStub] }
      })
      .compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(SharedLayout);
    component = fixture.componentInstance;
  });

  it('creates the layout', () => {
    expect(component).toBeTruthy();
  });
});
