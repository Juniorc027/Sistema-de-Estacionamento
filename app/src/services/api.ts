/**
 * ============================================================
 *  API Service — Comunicação REST com backend .NET
 * ============================================================
 */

import {
  ParkingSpot,
  HistoryReportDto,
  HourlyOccupancyDto,
  AverageDurationReportDto,
  SpotRankingDto,
  PagedResult,
  ParkingLotOverviewKpi,
  SpotRankingItemDetailed,
  TimePeriod,
  DashboardOverviewDto,
  OccupancyTimelineDto,
  SpotStatisticsDto,
} from '../types/parking';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5167';

export class ApiService {
  /**
   * Busca todas as vagas de um estacionamento específico
   * GET /api/parkingspots/by-lot/{parkingLotId}
   */
  static async getParkingSpots(parkingLotId: string): Promise<ParkingSpot[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/parkingspots/by-lot/${parkingLotId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch parking spots: ${response.statusText}`);
    }

    const result = await response.json();

    // O backend retorna ApiResponse<List<ParkingSpotResponseDto>>
    // Estrutura: { success: bool, message: string, data: [...], statusCode: int }
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    throw new Error(result.message || 'Failed to load parking spots');
  }

  /**
   * Busca vaga específica por ID
   * GET /api/parkingspots/{id}
   */
  static async getParkingSpotById(spotId: string): Promise<ParkingSpot> {
    const response = await fetch(`${API_BASE_URL}/api/parkingspots/${spotId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch spot: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      return result.data;
    }

    throw new Error(result.message || 'Failed to load spot');
  }

  // ===== MÉTODOS DE RELATÓRIOS =====

  /**
   * Histórico de entradas/saídas com paginação
   * GET /api/reports/history
   */
  static async getReportHistory(
    parkingLotId: string,
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PagedResult<HistoryReportDto>> {
    const params = new URLSearchParams({
      parkingLotId,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await fetch(
      `${API_BASE_URL}/api/reports/history?${params}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch history report: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Ocupação agregada por hora
   * GET /api/reports/hourly-occupancy
   */
  static async getReportHourlyOccupancy(
    parkingLotId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<HourlyOccupancyDto[]> {
    const params = new URLSearchParams({ parkingLotId });

    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await fetch(
      `${API_BASE_URL}/api/reports/hourly-occupancy?${params}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch hourly occupancy: ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Estatísticas de duração média
   * GET /api/reports/average-duration
   */
  static async getReportAverageDuration(
    parkingLotId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<AverageDurationReportDto> {
    const params = new URLSearchParams({ parkingLotId });

    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await fetch(
      `${API_BASE_URL}/api/reports/average-duration?${params}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch average duration: ${response.statusText}`
      );
    }

    return await response.json();
  }

  /**
   * Ranking de vagas por uso
   * GET /api/reports/spot-ranking
   */
  static async getReportSpotRanking(
    parkingLotId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<SpotRankingDto[]> {
    const params = new URLSearchParams({ parkingLotId });

    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await fetch(
      `${API_BASE_URL}/api/reports/spot-ranking?${params}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch spot ranking: ${response.statusText}`);
    }

    return await response.json();
  }

  // ===== MÉTODOS KPI PARA DASHBOARD =====

  /**
   * Busca dados de overview do Dashboard (KPI Cards)
   * GET /api/kpi/overview
   */
  static async getKpiOverview(
    parkingLotId: string,
    timePeriod: TimePeriod = TimePeriod.Today
  ): Promise<ParkingLotOverviewKpi> {
    const params = new URLSearchParams({
      parkingLotId,
      timePeriod,
    });

    const response = await fetch(
      `${API_BASE_URL}/api/kpi/overview?${params}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch KPI overview: ${response.statusText}`);
    }

    const result = await response.json();

    // Handle ApiResponse wrapper
    if (result.success && result.data) {
      return result.data;
    }

    // Handle direct response
    if (result.parkingLotId) {
      return result;
    }

    throw new Error(result.message || 'Failed to load KPI overview');
  }

  /**
   * Busca dados de ranking de vagas para o Dashboard
   * GET /api/kpi/ranking
   */
  static async getKpiRanking(
    parkingLotId: string,
    timePeriod: TimePeriod = TimePeriod.Today
  ): Promise<SpotRankingItemDetailed[]> {
    const params = new URLSearchParams({
      parkingLotId,
      timePeriod,
    });

    const response = await fetch(
      `${API_BASE_URL}/api/kpi/ranking?${params}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch KPI ranking: ${response.statusText}`);
    }

    const result = await response.json();

    // Handle ApiResponse wrapper
    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }

    // Handle direct array response
    if (Array.isArray(result)) {
      return result;
    }

    throw new Error(result.message || 'Failed to load KPI ranking');
  }

  /**
   * Exporta relatório em formato CSV
   * GET /api/reports/export
   * @returns Blob contendo os dados em CSV
   */
  static async exportReportToCsv(
    parkingLotId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<Blob> {
    const params = new URLSearchParams({
      parkingLotId,
    });

    if (dateFrom) params.append('from', dateFrom);
    if (dateTo) params.append('to', dateTo);

    const response = await fetch(
      `${API_BASE_URL}/api/reports/export?${params}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'text/csv',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to export CSV: ${response.statusText}`);
    }

    return await response.blob();
  }

  // ===== NOVOS MÉTODOS DO DASHBOARD SERVICE =====

  /**
   * Overview do Dashboard com ocupação, giro, pico e top 5 vagas
   * GET /api/dashboard/overview/{parkingLotId}
   */
  static async getDashboardOverview(parkingLotId: string): Promise<DashboardOverviewDto> {
    const response = await fetch(
      `${API_BASE_URL}/api/dashboard/overview/${parkingLotId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard overview: ${response.statusText}`);
    }

    const result = await response.json();

    // Handle ApiResponse wrapper if present
    if (result.success && result.data) {
      return result.data;
    }

    // Handle direct response
    if (result.parkingLotId) {
      return result;
    }

    throw new Error(result.message || 'Failed to load dashboard overview');
  }

  /**
   * Timeline de ocupação por hora para um dia
   * GET /api/dashboard/occupancy-timeline/{parkingLotId}
   */
  static async getOccupancyTimeline(parkingLotId: string): Promise<OccupancyTimelineDto> {
    const response = await fetch(
      `${API_BASE_URL}/api/dashboard/occupancy-timeline/${parkingLotId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch occupancy timeline: ${response.statusText}`);
    }

    const result = await response.json();

    // Handle ApiResponse wrapper if present
    if (result.success && result.data) {
      return result.data;
    }

    // Handle direct response
    if (result.parkingLotId && Array.isArray(result.hours)) {
      return result;
    }

    throw new Error(result.message || 'Failed to load occupancy timeline');
  }

  /**
   * Estatísticas completas de vagas (ranking)
   * GET /api/dashboard/spot-statistics/{parkingLotId}
   */
  static async getSpotStatistics(parkingLotId: string): Promise<SpotStatisticsDto> {
    const response = await fetch(
      `${API_BASE_URL}/api/dashboard/spot-statistics/${parkingLotId}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch spot statistics: ${response.statusText}`);
    }

    const result = await response.json();

    // Handle ApiResponse wrapper if present
    if (result.success && result.data) {
      return result.data;
    }

    // Handle direct response
    if (result.parkingLotId && Array.isArray(result.spots)) {
      return result;
    }

    throw new Error(result.message || 'Failed to load spot statistics');
  }
}
