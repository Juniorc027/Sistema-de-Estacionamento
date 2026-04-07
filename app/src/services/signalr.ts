/**
 * SignalR Service  
 */
import * as signalR from '@microsoft/signalr';
import { SpotUpdatedEvent, DashboardOverviewDto } from '../types/parking';

const HUB_URL = process.env.NEXT_PUBLIC_SIGNALR_URL || 'http://localhost:5167/hubs/parking';

export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private joinedParkingLotId: string | null = null;

  async start(): Promise<void> {
    if (this.connection) {
      if (this.connection.state === signalR.HubConnectionState.Connected) {
        return;
      }

      if (this.connection.state === signalR.HubConnectionState.Connecting) {
        return;
      }
    }

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

  // ✅ NOVO: Listener para atualizações silenciosas do Dashboard (KPIs + Ranking)
  onUpdateDashboardStats(callback: (stats: DashboardOverviewDto) => void): void {
    if (!this.connection) throw new Error('Not connected');
    this.connection.on('UpdateDashboardStats', (data: DashboardOverviewDto) => {
      console.log('[SignalR] Dashboard stats updated:', data);
      callback(data);
    });
  }

  off(eventName: string): void {
    this.connection?.off(eventName);
  }

  async stop(): Promise<void> {
    if (!this.connection) {
      return;
    }

    if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
      await this.connection.stop();
    }

    this.joinedParkingLotId = null;
  }
}

export const signalRService = new SignalRService();
