import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Component } from '@angular/core';
import { SharedLayout } from './shared-layout';
import { Navbar } from './navbar/navbar';
import { Sidebar } from './sidebar/sidebar';

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

  // jsdom does not implement window.matchMedia. SharedLayout reads it in a
  // field initializer to detect the mobile breakpoint, so the browser API has
  // to be stubbed for the component to be constructible in a test.
  const originalMatchMedia = window.matchMedia;

  beforeEach(async () => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    })) as unknown as typeof window.matchMedia;

    await TestBed.configureTestingModule({
      imports: [SharedLayout],
      providers: [
        provideRouter([{ path: '', component: EmptyPage }])
      ]
    })
      .overrideComponent(SharedLayout, {
        // The stubs reuse the selectors of the real components, so the real
        // imports have to be removed explicitly — an empty `remove.imports`
        // list is a no-op and would leave both definitions matching the same
        // element (NG0300).
        remove: { imports: [Navbar, Sidebar] },
        add: { imports: [NavbarStub, SidebarStub] }
      })
      .compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(SharedLayout);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('creates the layout', () => {
    expect(component).toBeTruthy();
  });
});
