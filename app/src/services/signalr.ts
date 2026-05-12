/**
 * SignalR Service - FUNCIONAL COM DEBUG COMPLETO
 */
import * as signalR from '@microsoft/signalr';
import { SpotUpdatedEvent, DashboardOverviewDto } from '../types/parking';

const HUB_URL = process.env.NEXT_PUBLIC_SIGNALR_URL || 'http://localhost:5167/hubs/parking';

console.log('[SignalR Init] HUB_URL =', HUB_URL);

export class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private joinedParkingLotId: string | null = null;

  async start(): Promise<void> {
    console.log('[SignalR] start() chamado');
    
    if (this.connection) {
      console.log('[SignalR] Conexão já existe. State:', this.connection.state);
      
      if (this.connection.state === signalR.HubConnectionState.Connected) {
        console.log('[SignalR] ✅ Já conectado');
        return;
      }

      if (this.connection.state === signalR.HubConnectionState.Connecting) {
        console.log('[SignalR] ⏳ Já conectando...');
        return;
      }
    }

    console.log('[SignalR] 🔧 Criando nova HubConnection para:', HUB_URL);
    
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect([0, 0, 5000])
      .build();

    // ✅ DEBUG: Expor para console
    (window as any).signalRConnection = this.connection;
    console.log('[SignalR] ✅ window.signalRConnection disponível');

    // Event handlers
    this.connection.onreconnecting(() => {
      console.log('[SignalR] 🔄 Reconectando...');
    });

    this.connection.onreconnected(async () => {
      console.log('[SignalR] ✅ Reconectado');
      if (this.joinedParkingLotId) {
        console.log('[SignalR] Rejoinando parkingLot:', this.joinedParkingLotId);
        await this.joinParkingLot(this.joinedParkingLotId);
      }
    });

    this.connection.onclose(async () => {
      console.log('[SignalR] ❌ Conexão fechada');
    });

    try {
      console.log('[SignalR] 📡 Iniciando conexão...');
      await this.connection.start();
      console.log('[SignalR] ✅ Conectado com sucesso! ID:', this.connection.connectionId);
    } catch (error) {
      console.error('[SignalR] ❌ ERRO ao conectar:', error);
      throw error;
    }
  }

  async joinParkingLot(parkingLotId: string): Promise<void> {
    console.log('[SignalR] joinParkingLot() chamado para:', parkingLotId);
    
    if (!this.connection) {
      console.error('[SignalR] ❌ Conexão não existe');
      throw new Error('Not connected');
    }

    console.log('[SignalR] State:', this.connection.state);
    
    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('[SignalR] ❌ Não conectado. State atual:', this.connection.state);
      throw new Error('Not connected. State: ' + this.connection.state);
    }

    if (this.joinedParkingLotId && this.joinedParkingLotId !== parkingLotId) {
      console.log('[SignalR] Deixando parkingLot anterior:', this.joinedParkingLotId);
      try {
        await this.connection.invoke('LeaveParkingLot', this.joinedParkingLotId);
      } catch (err) {
        console.warn('[SignalR] Aviso ao deixar parkingLot:', err);
      }
    }

    try {
      console.log('[SignalR] 📤 Invocando JoinParkingLot...');
      await this.connection.invoke('JoinParkingLot', parkingLotId);
      this.joinedParkingLotId = parkingLotId;
      console.log('[SignalR] ✅ JoinParkingLot sucesso!');
    } catch (err) {
      console.error('[SignalR] ❌ ERRO em JoinParkingLot:', err);
      throw err;
    }
  }

  onSpotUpdated(callback: (event: SpotUpdatedEvent) => void): void {
    console.log('[SignalR] Registrando listener para SpotUpdated');
    
    if (!this.connection) {
      console.error('[SignalR] ❌ Conexão não existe');
      throw new Error('Not connected');
    }

    this.connection.on('SpotUpdated', (data: SpotUpdatedEvent) => {
      console.log('[SignalR] 🟢 SpotUpdated RECEBIDO:', data);
      callback(data);
    });

    console.log('[SignalR] ✅ Listener SpotUpdated registrado');
  }

  onUpdateDashboardStats(callback: (stats: DashboardOverviewDto) => void): void {
    console.log('[SignalR] Registrando listener para UpdateDashboardStats');
    
    if (!this.connection) {
      console.error('[SignalR] ❌ Conexão não existe');
      throw new Error('Not connected');
    }

    this.connection.on('UpdateDashboardStats', (data: DashboardOverviewDto) => {
      console.log('[SignalR] 🟢 UpdateDashboardStats RECEBIDO:', data);
      callback(data);
    });

    console.log('[SignalR] ✅ Listener UpdateDashboardStats registrado');
  }

  off(eventName: string): void {
    console.log('[SignalR] Removendo listener:', eventName);
    this.connection?.off(eventName);
  }

  async stop(): Promise<void> {
    console.log('[SignalR] stop() chamado');
    
    if (!this.connection) {
      console.log('[SignalR] Nenhuma conexão ativa');
      return;
    }

    if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
      try {
        await this.connection.stop();
        console.log('[SignalR] ✅ Desconectado');
      } catch (err) {
        console.error('[SignalR] ❌ Erro ao desconectar:', err);
      }
    }

    this.joinedParkingLotId = null;
  }
}

export const signalRService = new SignalRService();
