import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { TemplateCard } from './template-card';
import { TemplatePreviewModal } from './preview-modal';
import { TEMPLATE_CARDS, TemplateCardModel } from './template-data';

/**
 * Public-website template showcase.
 *
 * A grid of four animated marketing cards driven by the typed TEMPLATE_CARDS
 * model. "Preview" opens an in-section concept dialog; "Use Template"
 * navigates to /register via the Angular Router. The former embedded
 * interactive Brewed & Co. demo has been removed — the showcase now renders
 * only the four template cards. Everything is scoped to this component
 * folder so it can be replaced by the real template system later.
 */
@Component({
  selector: 'app-template-showcase',
  standalone: true,
  imports: [TemplateCard, TemplatePreviewModal],
  templateUrl: './template-showcase.html',
  styleUrl: './template-showcase.css'
})
export class TemplateShowcase implements AfterViewInit {
  private readonly router = inject(Router);

  protected readonly templates = TEMPLATE_CARDS;

  /** Template whose preview dialog is currently open (null = closed). */
  protected readonly previewingTemplate = signal<TemplateCardModel | null>(null);

  /**
   * Entrance-reveal state for the card grid. The SSR-prerendered page always
   * shows fully visible cards; in interactive hydrating browsers a one-shot
   * IntersectionObserver (set up in ngAfterViewInit, browser only) hides the
   * cards and reveals them with a staggered fade-up when the section scrolls
   * into view. If JS never runs, cards simply remain visible.
   */
  protected readonly revealState = signal<'idle' | 'pending' | 'revealed'>('idle');

  private readonly gridRef = viewChild<ElementRef<HTMLDivElement>>('templateGrid');

  ngAfterViewInit(): void {
    // SSR guard: browser globals are only touched when a real window exists.
    if (typeof IntersectionObserver !== 'function') return;

    const grid = this.gridRef()?.nativeElement;
    if (!grid) return;

    this.revealState.set('pending');
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.revealState.set('revealed');
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(grid);
  }

  /** Open the in-section preview dialog for a template card. */
  protected openPreview(template: TemplateCardModel): void {
    this.previewingTemplate.set(template);
  }

  protected closePreview(): void {
    this.previewingTemplate.set(null);
  }

  /**
   * "Use Template" simply starts account sign-up. The current onboarding
   * flow does not accept a template identifier, so none is persisted here.
   */
  protected useTemplate(): void {
    void this.router.navigate(['/register']);
  }
}
