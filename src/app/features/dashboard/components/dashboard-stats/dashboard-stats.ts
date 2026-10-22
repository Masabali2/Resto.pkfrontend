import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  LucideBuilding2,
  LucideChefHat,
  LucideGlobe,
  LucideUtensils
} from '@lucide/angular';
import type { DashboardMetric } from '../../models/dashboard-metric.model';

/**
 * Grid of dashboard statistic cards.
 *
 * The component only renders the metrics it is given; deciding what is
 * measurable (and whether a value is genuinely available) stays with the
 * dashboard container.
 */
@Component({
  selector: 'app-dashboard-stats',
  standalone: true,
  imports: [LucideBuilding2, LucideChefHat, LucideGlobe, LucideUtensils],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-stats.html',
  styleUrl: './dashboard-stats.css'
})
export class DashboardStats {
  readonly metrics = input<readonly DashboardMetric[]>([]);
}
