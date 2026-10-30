import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { BackLink } from '../../../../shared/components/back-link/back-link';
import { Button } from '../../../../shared/components/button/button';
import { NotificationService } from '../../../../core/services/notification.service';
import { SubscriptionFlowService } from '../../services/subscription-flow.service';
import { SubscriptionService } from '../../services/subscription.service';
import { SubscriptionOffer } from '../../components/subscription-offer/subscription-offer';
import { SubscriptionPlanList } from '../../components/subscription-plan-list/subscription-plan-list';
import { SubscriptionStatusCard } from '../../components/subscription-status-card/subscription-status-card';
import { resolveSubscriptionStatus } from '../../utils/subscription-status.util';

/**
 * The plan-selection page.
 *
 * It is the routable version of the shared subscription experience: the same
 * offer, the same plan list and the same trial rules as the dashboard card
 * and the shared dialog — only the frame around them differs.
 *
 * Everything shown here comes from the verified backend state; the page
 * never guesses whether a trial may be started.
 */
@Component({
  selector: 'app-subscription-page',
  standalone: true,
  imports: [
    BackLink,
    Button,
    SubscriptionOffer,
    SubscriptionPlanList,
    SubscriptionStatusCard
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-page.html',
  styleUrls: ['./subscription-page.css', '../../components/subscription-tokens.css']
})
export class SubscriptionPage {
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);
  private readonly subscriptionService = inject(SubscriptionService);

  /** Shared subscription flow — the single source of truth. */
  protected readonly subscriptionFlow = inject(SubscriptionFlowService);

  protected readonly state = this.subscriptionFlow.state;

  protected readonly loading = this.subscriptionFlow.loading;

  protected readonly status = computed(() =>
    resolveSubscriptionStatus(this.state(), this.loading())
  );

  protected startTrial(): void {
    this.subscriptionFlow.startTrial();
  }

  protected async cancelSubscription(): Promise<void> {
    const subscription = this.state()?.subscription ?? null;

    if (!subscription) {
      return;
    }

    if (
      !confirm(
        `Cancel your ${subscription.planName} subscription? You will lose access to paid features at the end of the billing period.`
      )
    ) {
      return;
    }

    try {
      await firstValueFrom(
        this.subscriptionService.cancelSubscription(subscription.id),
      );

      this.notificationService.success('Your subscription has been cancelled.');
    } catch (error: unknown) {
      this.notificationService.error(
        this.subscriptionService.describeError(error),
      );
    }
  }

  protected backToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }
}
