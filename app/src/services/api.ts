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
} from '../types/parking';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5167';
const API_TIMEOUT_MS = 30000;

export class ApiService {
  private static async fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
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

  // ===== VAGAS =====

  static async getParkingSpots(parkingLotId: string): Promise<ParkingSpot[]> {
    const result = await this.fetchApi<any>(`${API_BASE_URL}/api/parkingspots/by-lot/${parkingLotId}`);
    if (result.success && Array.isArray(result.data)) return result.data;
    throw new Error(result.message || 'Failed to load parking spots');
  }

  static async getParkingSpotById(spotId: string): Promise<ParkingSpot> {
    const result = await this.fetchApi<any>(`${API_BASE_URL}/api/parkingspots/${spotId}`);
    if (result.success && result.data) return result.data;
    throw new Error(result.message || 'Failed to load spot');
  }

  // ===== RELATÓRIOS =====

  static async getReportHistory(
    parkingLotId: string,
    dateFrom?: string,
    dateTo?: string,
    page = 1,
    pageSize = 10
  ): Promise<PagedResult<HistoryReportDto>> {
    const params = new URLSearchParams({ parkingLotId, page: page.toString(), pageSize: pageSize.toString() });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return this.fetchApi<PagedResult<HistoryReportDto>>(`${API_BASE_URL}/api/reports/history?${params}`);
  }

  static async getReportHourlyOccupancy(
    parkingLotId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<HourlyOccupancyDto[]> {
    const params = new URLSearchParams({ parkingLotId });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return this.fetchApi<HourlyOccupancyDto[]>(`${API_BASE_URL}/api/reports/hourly-occupancy?${params}`);
  }

  static async getReportAverageDuration(
    parkingLotId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<AverageDurationReportDto> {
    const params = new URLSearchParams({ parkingLotId });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return this.fetchApi<AverageDurationReportDto>(`${API_BASE_URL}/api/reports/average-duration?${params}`);
  }

  static async getReportSpotRanking(
    parkingLotId: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<SpotRankingDto[]> {
    const params = new URLSearchParams({ parkingLotId });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return this.fetchApi<SpotRankingDto[]>(`${API_BASE_URL}/api/reports/spot-ranking?${params}`);
  }
}
