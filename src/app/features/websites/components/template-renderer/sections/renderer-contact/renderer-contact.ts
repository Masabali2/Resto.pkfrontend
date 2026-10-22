import {
  ChangeDetectionStrategy,
  Component,
  input
} from '@angular/core';
import type {
  TemplateRendererMode,
  WebsiteTemplateDesignViewModel
} from '../../../../models/website-template-design.model';

/**
 * Contact section of the generic renderer. The values are deliberately
 * neutral placeholders — the preview never fabricates a real address or
 * phone number for a tenant.
 */
@Component({
  selector: 'app-renderer-contact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './renderer-contact.html',
  styleUrl: './renderer-contact.css'
})
export class RendererContact {
  readonly viewModel = input.required<WebsiteTemplateDesignViewModel>();
  readonly mode = input<TemplateRendererMode>('card');
}
