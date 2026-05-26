/**
 * SignalR Service  
 */
import * as signalR from '@microsoft/signalr';
import { SpotUpdatedEvent } from '../types/parking';

const HUB_URL = process.env.NEXT_PUBLIC_SIGNALR_URL || 'http://localhost:5167/hubs/parking';

export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private joinedParkingLotId: string | null = null;
  private startPromise: Promise<void> | null = null;

  async start(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    this.startPromise = (async () => {
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL)
        .withAutomaticReconnect()
        .build();

      this.connection.onreconnected(async () => {
        if (this.joinedParkingLotId) {
          await this.joinParkingLot(this.joinedParkingLotId);
        }
      });

      await this.connection.start();
      console.log('[SignalR] Connected');
    })().finally(() => {
      this.startPromise = null;
    });

    return this.startPromise;
  }

  async joinParkingLot(parkingLotId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected');
    }

    if (this.joinedParkingLotId && this.joinedParkingLotId !== parkingLotId) {
      await this.connection.invoke('LeaveParkingLot', this.joinedParkingLotId);
    }

    await this.connection.invoke('JoinParkingLot', parkingLotId);
    this.joinedParkingLotId = parkingLotId;
  }

  // ✅ NOVO: Listener para atualizações do mapa 2D
  onSpotUpdated(callback: (event: SpotUpdatedEvent) => void): void {
    if (!this.connection) throw new Error('Not connected');
    this.connection.on('SpotUpdated', callback);
  }

  onUpdateDashboardStats(callback: (stats: unknown) => void): void {
    if (!this.connection) throw new Error('Not connected');
    this.connection.on('UpdateDashboardStats', (data: unknown) => {
      callback(data);
    });
  }

  off(eventName: string): void {
    this.connection?.off(eventName);
  }

  async stop(): Promise<void> {
    const conn = this.connection;
    this.connection = null;
    this.joinedParkingLotId = null;
    this.startPromise = null;

    if (conn && conn.state !== signalR.HubConnectionState.Disconnected) {
      await conn.stop().catch(() => {});
    }
  }
}

export const signalRService = new SignalRService();
