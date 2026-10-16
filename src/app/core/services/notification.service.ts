
import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notificationState = signal<AppNotification[]>([]);
  private nextId = 0;

  readonly notifications = this.notificationState.asReadonly();

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  dismiss(id: number): void {
    this.notificationState.update(items =>
      items.filter(item => item.id !== id)
    );
  }

  private show(type: NotificationType, message: string): void {
    const id = ++this.nextId;

    this.notificationState.update(items => [
      ...items,
      { id, type, message }
    ]);

    setTimeout(() => this.dismiss(id), 5000);
  }
}
