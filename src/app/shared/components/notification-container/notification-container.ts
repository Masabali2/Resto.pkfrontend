
import { Component, inject } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  templateUrl: './notification-container.html',
  styleUrl: './notification-container.css'
})
export class NotificationContainer {
  protected readonly notificationService = inject(NotificationService);
}
