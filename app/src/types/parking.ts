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

// ===== TIPOS DE RELATÓRIOS =====

export interface ReportFilter {
  parkingLotId: string;
  dateFrom: string; // ISO 8601
  dateTo: string;   // ISO 8601
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface HistoryReportDto {
  sessionId: string;
  spotId: string;
  spotNumber: string;
  licensePlate: string;
  entryTime: string; // DateTime ISO
  exitTime: string | null;
  duration: string | null; // TimeSpan format "HH:MM:SS.mmm"
  amount: number;
  parkingLotName: string;
}

export interface HourlyOccupancyDto {
  hour: string; // DateTime ISO (represents hour on the date)
  averageOccupancy: number; // percentage 0-100
  peakOccupiedCount: number;
  totalSpots: number;
}

export interface AverageDurationReportDto {
  totalSessions: number;
  averageDuration: string; // TimeSpan format "HH:MM:SS.mmm"
  minimumDuration: string | null; // TimeSpan format
  maximumDuration: string | null; // TimeSpan format
  sessionsToday: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
}

export interface SpotRankingDto {
  spotNumber: string;
  useCount: number;
  averageDurationMinutes: number; // decimal as number
  occupancyRate: number; // decimal as number (percentage)
  status: string;
}


