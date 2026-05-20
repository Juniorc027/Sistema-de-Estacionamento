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
const API_TIMEOUT_MS = 30000; // 30 segundos

export class ApiService {
  /**
   * Método base para todas as requisições HTTP
   * Encapsula: fetch + response.ok + response.json() + timeout + error handling
   * @private
   */
  private static async fetchApi<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error: Unable to reach server');
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${API_TIMEOUT_MS}ms`);
      }

      throw error;
    }
  }

  /**
   * Busca todas as vagas de um estacionamento específico
   * GET /api/parkingspots/by-lot/{parkingLotId}
   */
  static async getParkingSpots(parkingLotId: string): Promise<ParkingSpot[]> {
    const result = await this.fetchApi<any>(
      `${API_BASE_URL}/api/parkingspots/by-lot/${parkingLotId}`,
      { method: 'GET' }
    );

    // O backend retorna ApiResponse<List<ParkingSpotResponseDto>>
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
    const result = await this.fetchApi<any>(
      `${API_BASE_URL}/api/parkingspots/${spotId}`,
      { method: 'GET' }
    );

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

    return this.fetchApi<PagedResult<HistoryReportDto>>(
      `${API_BASE_URL}/api/reports/history?${params}`,
      { method: 'GET' }
    );
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

    return this.fetchApi<HourlyOccupancyDto[]>(
      `${API_BASE_URL}/api/reports/hourly-occupancy?${params}`,
      { method: 'GET' }
    );
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

    return this.fetchApi<AverageDurationReportDto>(
      `${API_BASE_URL}/api/reports/average-duration?${params}`,
      { method: 'GET' }
    );
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

    return this.fetchApi<SpotRankingDto[]>(
      `${API_BASE_URL}/api/reports/spot-ranking?${params}`,
      { method: 'GET' }
    );
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

    const result = await this.fetchApi<any>(
      `${API_BASE_URL}/api/kpi/overview?${params}`,
      { method: 'GET' }
    );

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

    const result = await this.fetchApi<any>(
      `${API_BASE_URL}/api/kpi/ranking?${params}`,
      { method: 'GET' }
    );

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
    const params = new URLSearchParams({ parkingLotId });

    if (dateFrom) params.append('from', dateFrom);
    if (dateTo) params.append('to', dateTo);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reports/export?${params}`,
        {
          method: 'GET',
          headers: { 'Accept': 'text/csv' },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ===== NOVOS MÉTODOS DO DASHBOARD SERVICE =====

  /**
   * Overview do Dashboard com ocupação, giro, pico e top 5 vagas
   * GET /api/dashboard/overview/{parkingLotId}
   */
  static async getDashboardOverview(parkingLotId: string): Promise<DashboardOverviewDto> {
    const result = await this.fetchApi<any>(
      `${API_BASE_URL}/api/dashboard/overview/${parkingLotId}`,
      { method: 'GET' }
    );

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
    const result = await this.fetchApi<any>(
      `${API_BASE_URL}/api/dashboard/occupancy-timeline/${parkingLotId}`,
      { method: 'GET' }
    );

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
    const result = await this.fetchApi<any>(
      `${API_BASE_URL}/api/dashboard/spot-statistics/${parkingLotId}`,
      { method: 'GET' }
    );

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
