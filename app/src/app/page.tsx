'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { useSignalR } from '../hooks/useSignalR';
import { ParkingSpot, SpotUpdatedEvent } from '../types/parking';

const ParkingLot3D = dynamic(
  () => import('../components/ParkingLot3D').then((mod) => mod.ParkingLot3D),
  { ssr: false }
);

const PARKING_LOT_ID = '45fc18f2-bdd8-4b11-b964-f8face1147f0';

export default function Home() {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialSpots() {
      try {
        const spotsData = await ApiService.getParkingSpots(PARKING_LOT_ID);
        setSpots(spotsData);
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
    console.log('[Home] SpotUpdated event received:', event);
    setSpots((prevSpots) => {
      return prevSpots.map((spot) => {
        if (spot.spotNumber === event.spotNumber) {
          return { ...spot, status: event.status };
        }
        return spot;
      });
    });
  }, []);

  const { isConnected, error: signalRError } = useSignalR(handleSpotUpdated);

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
    <main className="w-full h-screen bg-gray-900 relative">
      {/* Status bar overlay */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-gray-800/90 p-4 rounded-lg">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-white font-medium">
              {isConnected ? 'Tempo Real Ativo' : 'Desconectado'}
            </span>
          </div>
          {signalRError && (
            <p className="text-red-400 text-sm mt-2">SignalR: {signalRError}</p>
          )}
        </div>
      </div>

      {/* Visualização 3D */}
      <ParkingLot3D spots={spots} />
    </main>
  );
}
