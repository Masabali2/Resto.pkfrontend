import { inject, Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

import { environment } from '../../../../environments/environment';

/**
 * Manages the SignalR connection to the order hub (`/hubs/orders`).
 *
 * One connection is kept per URL for the lifetime of the browser tab.
 * Staff subscribe to their restaurant group; anonymous customers subscribe to
 * a single order group through a validated tracking token. Credentials are
 * sent so the shopper session cookie (customers) and the auth cookie (staff)
 * are attached to the WebSocket connection, matching the existing CORS
 * policy that allows credentials from the frontend origin.
 */
@Injectable({ providedIn: 'root' })
export class OrderSignalRService {
  private readonly connections = new Map<string, HubConnection>();

  private readonly hubUrl =
    environment.apiUrl.replace(/\/+$/, '') + '/hubs/orders';

  connect(url: string = this.hubUrl): HubConnection {
    let connection = this.connections.get(url);
    if (!connection) {
      connection = new HubConnectionBuilder()
        .withUrl(url, { withCredentials: true })
        .withAutomaticReconnect()
        .build();
      this.connections.set(url, connection);
    }
    return connection;
  }

  disconnect(url: string = this.hubUrl): void {
    const connection = this.connections.get(url);
    if (connection) {
      connection.stop().catch(() => {
        /* best effort */
      });
      this.connections.delete(url);
    }
  }

  disconnectAll(): void {
    for (const connection of this.connections.values()) {
      connection.stop().catch(() => {
        /* best effort */
      });
    }
    this.connections.clear();
  }
}
