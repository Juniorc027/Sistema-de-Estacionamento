'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { useSignalR } from '../hooks/useSignalR';
import { ParkingSpot, ParkingSpotStatus, SpotUpdatedEvent } from '../types/parking';
import { Sidebar } from '../components/ui/Sidebar';
import { ParkingLotWithFallback } from '../components/parking/ParkingLotWithFallback';

const PARKING_LOT_ID = process.env.NEXT_PUBLIC_PARKING_LOT_ID || '45fc18f2-bdd8-4b11-b964-f8face1147f0';

function normalizeSpotNumber(spotNumber: string | number): string {
  const numericValue = typeof spotNumber === 'string' ? parseInt(spotNumber, 10) : spotNumber;
  return numericValue.toString().padStart(3, '0');
}

function normalizeStatusValue(value: number | string): ParkingSpotStatus {
  if (typeof value === 'number') {
    return value as ParkingSpotStatus;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'occupied' || normalized === 'ocupada') return ParkingSpotStatus.Occupied;
  if (normalized === 'reserved' || normalized === 'reservada') return ParkingSpotStatus.Reserved;
  if (normalized === 'maintenance' || normalized === 'manutencao') return ParkingSpotStatus.Maintenance;
  return ParkingSpotStatus.Free;
}

export default function Home() {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialSpots() {
      try {
        const spotsData = await ApiService.getParkingSpots(PARKING_LOT_ID);
        const normalizedSpots = spotsData.map((spot) => ({
          ...spot,
          spotNumber: normalizeSpotNumber(spot.spotNumber),
        }));
        setSpots(normalizedSpots);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load spots:', err);
        setError(err instanceof Error ? err.message : 'Failed to load parking data');
        setLoading(false);
      }
    }

    loadInitialSpots();
  }, []);

  const handleSpotUpdated = useCallback((event: SpotUpdatedEvent) => {
    if (event.parkingLotId !== PARKING_LOT_ID) return;

    const normalizedStatus = normalizeStatusValue(event.status);
    const normalizedSpotNumber = normalizeSpotNumber(event.spotNumber);

    setSpots((prevSpots) =>
      prevSpots.map((spot) => {
        const spotNum = normalizeSpotNumber(spot.spotNumber);
        if (spotNum === normalizedSpotNumber) {
          return { ...spot, status: normalizedStatus };
        }
        return spot;
      })
    );
  }, []);

  const { isConnected, error: signalRError } = useSignalR(handleSpotUpdated, PARKING_LOT_ID);

  if (loading) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Carregando estacionamento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-900 text-white p-8 rounded-lg max-w-md">
          <h2 className="text-2xl font-bold mb-4">Erro ao carregar</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full h-screen bg-gray-900 relative overflow-hidden">
      {/* Sidebar esquerda — apenas Relatórios */}
      <div className="absolute inset-y-0 left-0 z-20">
        <Sidebar />
      </div>

      {/* Badge de status SignalR */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-gray-800/90 p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-white font-medium">
              {isConnected ? 'Tempo Real Ativo' : 'Desconectado'}
            </span>
          </div>
          {signalRError && (
            <p className="text-red-400 text-sm mt-2">SignalR: {signalRError}</p>
          )}
        </div>
      </div>

      {/* Visualização 3D centralizada */}
      <div className="w-full h-full">
        <ParkingLotWithFallback spots={spots} />
      </div>
    </main>
  );
}
