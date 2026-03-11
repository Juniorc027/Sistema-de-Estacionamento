/**
 * ============================================================
 *  API Service — Comunicação REST com backend .NET
 * ============================================================
 */

import { ParkingSpot } from '../types/parking';

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
}
