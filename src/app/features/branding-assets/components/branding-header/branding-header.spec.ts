import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandingHeader } from './branding-header';
import type { StorageInfo } from '../../models/branding-assets.models';

describe('BrandingHeader', () => {
  let component: BrandingHeader;
  let fixture: ComponentFixture<BrandingHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandingHeader]
    }).compileComponents();

    fixture = TestBed.createComponent(BrandingHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default inputs to falsy/empty values', () => {
    expect(component.restaurant()).toBeNull();
    expect(component.storage()).toBeNull();
    expect(component.storageLoading()).toBe(false);
    expect(component.dirty()).toBe(false);
    expect(component.saving()).toBe(false);
  });

  it('storagePercent should be 100 when used equals quota', () => {
    (component as any).storage.set({ usedBytes: 1024 * 1024, quotaBytes: 1024 * 1024 } as StorageInfo);
    expect((component as any).storagePercent()).toBe(100);
  });

  it('storageUsedText should report used and quota', () => {
    (component as any).storage.set({ usedBytes: 1024 * 1024, quotaBytes: 1024 * 1024 } as StorageInfo);
    expect((component as any).storageUsedText()).toBe('1 MB / 1 MB');
  });

  it('storageUsedText should return dash when no storage', () => {
    (component as any).storage.set(null);
    expect((component as any).storageUsedText()).toBe('—');
  });

  it('should emit previewClicked when preview button is clicked', () => {
    let emitted = false;
    component.previewClicked.subscribe(() => (emitted = true));
    const btn = fixture.nativeElement.querySelector('.brand-btn-preview') as HTMLButtonElement | null;
    btn?.click();
    expect(emitted).toBe(true);
  });

  it('should emit saveClicked when save button is clicked', () => {
    let emitted = false;
    component.saveClicked.subscribe(() => (emitted = true));
    const btn = fixture.nativeElement.querySelector('.brand-btn-save') as HTMLButtonElement | null;
    btn?.click();
    expect(emitted).toBe(true);
  });

  it('should disable save button when saving', () => {
    (component as any).saving.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.brand-btn-save') as HTMLButtonElement | null;
    expect(btn?.disabled).toBe(true);
  });
});
