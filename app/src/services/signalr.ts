/**
 * SignalR Service  
 */
import * as signalR from '@microsoft/signalr';
import { SpotUpdatedEvent } from '../types/parking';

const HUB_URL = process.env.NEXT_PUBLIC_SIGNALR_URL || 'http://localhost:5167/hubs/parking';

export class SignalRService {
  private connection: signalR.HubConnection | null = null;

  async start(): Promise<void> {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    await this.connection.start();
    console.log('[SignalR] Connected');
  }

  onSpotUpdated(callback: (event: SpotUpdatedEvent) => void): void {
    if (!this.connection) throw new Error('Not connected');
    this.connection.on('SpotUpdated', callback);
  }

  off(eventName: string): void {
    this.connection?.off(eventName);
  }
}

export const signalRService = new SignalRService();
