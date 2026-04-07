/**
 * ============================================================
 *  Parking System — Frontend Types
 * ============================================================
 *  Tipos TypeScript que mapeiam os DTOs do backend .NET
 */

export enum ParkingSpotStatus {
  Free = 0,
  Occupied = 1,
  Reserved = 2,
  Maintenance = 3,
}

export interface ParkingSpot {
  id: string; // Guid do backend
  spotNumber: string; // "001", "002", etc
  status: ParkingSpotStatus;
  statusDescription: string;
  parkingLotId: string;
  parkingLotName: string;
  createdAt: string;
}

// Evento SignalR do backend
export interface SpotUpdatedEvent {
  parkingLotId: string;
  spotId: string;
  spotNumber: string;
  status: ParkingSpotStatus;
  timestamp: string;
}

// Para cálculo de posições 3D
export interface Spot3DPosition {
  spotNumber: string;
  x: number;
  y: number;
  z: number;
  status: ParkingSpotStatus;
}
