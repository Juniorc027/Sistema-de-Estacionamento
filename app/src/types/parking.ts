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

export type ReportId = "history" | "occupancy" | "duration" | "ranking";

// ===== NAVEGAÇÃO/PANELS =====

/**
 * PanelId representa qual painel/aba está ativo na aplicação
 * - 'dashboard': Mostra o DashboardPanel (novos KPIs + Ranking)
 * - ReportId: Mostra o ReportPanel (relatórios modais individuais)
 */
export type PanelId = "dashboard" | ReportId;

// ===== KPI E DASHBOARD =====

export enum TimePeriod {
  Today = "today",
  Yesterday = "yesterday",
  LastWeek = "lastWeek",
  LastMonth = "lastMonth",
}

export interface KpiOccupancy {
  occupancyPercentage: number; // 0-100
  occupiedCount: number;
  totalSpots: number;
  trend: number; // -5, +3, etc (percentage change from previous period)
}

export interface KpiEntries {
  totalEntriesCount: number;
  trend: number; // percentage change
  averageEntriesPerHour: number;
  peakHour: string; // "14:00" format
}

export interface KpiPeakHour {
  hourFrom: string; // "14:00" format
  hourTo: string;   // "15:30" format
  occupancyPercentage: number;
  entriesCount: number;
}

export interface ParkingLotOverviewKpi {
  parkingLotId: string;
  parkingLotName: string;
  occupancy: KpiOccupancy;
  entries: KpiEntries;
  peakHour: KpiPeakHour;
  lastUpdated: string; // ISO timestamp
}

export interface SpotRankingItemDetailed {
  rank: number;
  spotNumber: string;
  spotId: string;
  useCount: number;
  maxUseCount: number; // For heatmap normalization
  averageDurationMinutes: number;
  occupancyRate: number; // 0-100
  status: string;
  frequencyBadge: "🔥" | "⭐" | "🧊" | ""; // heat, star, cold, or empty
}

export interface DashboardData {
  kpi: ParkingLotOverviewKpi;
  ranking: SpotRankingItemDetailed[];
}

// ===== NOVOS TIPOS DO DASHBOARD BACKEND (Backend Service) =====

/**
 * Métrica de ocupação atual
 */
export interface OccupancyMetricDto {
  occupancyPercentage: number; // 0-100
  occupiedSpots: number;
  totalSpots: number;
  availableSpots?: number; // computed
  trendPercentage: number; // Comparação com período anterior
  occupancyStatus: "Alto" | "Normal" | "Baixo"; // Alto >=90%, Normal >=60%
}

/**
 * Giro de vagas (veículos) em 24 horas
 */
export interface VehicleThroughputDto {
  entriesLast24Hours: number;
  exitsLast24Hours: number;
  averageEntriesPerHour: number;
  peakEntriesInOneHour: number;
}

/**
 * Horário de pico do dia
 */
export interface PeakHourDto {
  hour: number; // 0-23
  entriesCount: number;
  occupancyPercentage: number; // % de ocupação naquela hora
  timeRange?: string; // Computed: "14:00 - 15:00"
}

/**
 * Ranking de uma vaga individual
 */
export interface SpotRankingItemDto {
  rank: number;
  spotId: string;
  spotNumber: string;
  entryCount: number;
  averageOccupancyMinutes: number;
  utilizationRate: number; // 0-100%
  currentStatus: "Livre" | "Ocupada" | "Reservada" | "Manutenção" | "Desconhecido";
  badge: "🔥" | "⭐" | "🧊" | ""; // 🔥 rank 1, ⭐ rank 2-3, 🧊 rank ultimas 3
}

/**
 * Ocupação hora-a-hora de um dia (24 horas)
 */
export interface HourlyOccupancyDetailDto {
  hour: number; // 0-23
  averageOccupancy: number; // % média de ocupação
  peakOccupancy: number; // % pico de ocupação
  entriesCount: number;
  exitsCount: number;
}

/**
 * Timeline de ocupação para um dia inteiro
 */
export interface OccupancyTimelineDto {
  parkingLotId: string;
  date: string; // ISO date
  hours: HourlyOccupancyDetailDto[];
}

/**
 * Estatísticas completas de vagas para um período (ano)
 */
export interface SpotStatisticsDto {
  parkingLotId: string;
  spots: SpotRankingItemDto[]; // Ranking completo
  averageUtilization: number; // % média de utilização
  standardDeviation: number; // Desvio padrão
  calculatedAt: string; // ISO timestamp
}

/**
 * Overview completo do dashboard
 * Contém ocupação, giro, pico e top 5 vagas
 */
export interface DashboardOverviewDto {
  parkingLotId: string;
  parkingLotName: string;
  occupancy: OccupancyMetricDto;
  throughput: VehicleThroughputDto;
  peakHour: PeakHourDto;
  topSpots: SpotRankingItemDto[];
  lastUpdated: string; // ISO timestamp
}

