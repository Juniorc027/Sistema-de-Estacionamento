'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '../services/api';
import { useSignalR } from '../hooks/useSignalR';
import { ParkingSpot, ParkingSpotStatus, SpotUpdatedEvent, PanelId, ReportId } from '../types/parking';
import { Sidebar } from '../components/ui/Sidebar';
import { ReportPanel } from '../components/ui/ReportPanel';
import { DashboardPanel } from '../components/ui/DashboardPanel';
import { ParkingLotWithFallback } from '../components/parking/ParkingLotWithFallback';

const PARKING_LOT_ID = '45fc18f2-bdd8-4b11-b964-f8face1147f0';

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
  const [activePanel, setActivePanel] = useState<PanelId>('dashboard');

  useEffect(() => {
    async function loadInitialSpots() {
      try {
        const spotsData = await ApiService.getParkingSpots(PARKING_LOT_ID);
        // Garantir que todos os spotNumbers estejam normalizados com padding "001", "002", etc
        const normalizedSpots = spotsData.map((spot) => ({
          ...spot,
          spotNumber: normalizeSpotNumber(spot.spotNumber),
        }));
        console.log('[Home] Loaded spots (normalized):', normalizedSpots.map((s) => `${s.spotNumber}:${s.status}`).join(', '));
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
    console.log('[Home] SpotUpdated event received:', event);
    console.log('[Home] Event spotNumber:', event.spotNumber, 'type:', typeof event.spotNumber);

    if (event.parkingLotId !== PARKING_LOT_ID) {
      console.log('[Home] Ignoring event from different parking lot:', event.parkingLotId);
      return;
    }

    const normalizedStatus = normalizeStatusValue(event.status);
    const normalizedSpotNumber = normalizeSpotNumber(event.spotNumber);

    console.log('[Home] Normalized spotNumber:', normalizedSpotNumber);

    setSpots((prevSpots) => {
      const updatedSpots = prevSpots.map((spot) => {
        const spotNum = normalizeSpotNumber(spot.spotNumber);
        console.log('[Home] Comparing spot:', spotNum, 'with event:', normalizedSpotNumber, 'match:', spotNum === normalizedSpotNumber);
        
        if (spotNum === normalizedSpotNumber) {
          console.log('[Home] ✅ MATCH! Updating spot', spotNum, 'status:', spot.status, '→', normalizedStatus);
          return { ...spot, status: normalizedStatus };
        }
        return spot;
      });
      return updatedSpots;
    });
  }, []);

  const { isConnected, error: signalRError } = useSignalR(handleSpotUpdated, PARKING_LOT_ID);

  const handleSelectPanel = useCallback((panelId: PanelId) => {
    console.log(`[Home] Panel selected: ${panelId}`);
    setActivePanel(panelId);
  }, []);

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

  // Determinar qual painel renderizar baseado no activePanel
  const isPanelActive = activePanel !== 'dashboard';

  return (
    <main className="w-full h-screen bg-gray-900 relative overflow-hidden">
      {/* Left Sidebar - Navigation Menu */}
      <div className="absolute inset-y-0 left-0 z-20">
        <Sidebar activePanel={activePanel} onSelectPanel={handleSelectPanel} />
      </div>

      {/* Right Panel - Conditional Rendering */}
      <div className="absolute inset-y-0 right-0 z-20">
        {activePanel === 'dashboard' && (
          /* Dashboard Tab */
          <DashboardPanel 
            parkingLotId={PARKING_LOT_ID}
            onSpotClick={(spotId, spotNumber) => {
              console.log(`[Home] Spot clicked from dashboard: ${spotNumber} (${spotId})`);
              // Futuramente: focar câmera 3D na vaga
            }}
          />
        )}

        {activePanel === 'occupancy' && (
          /* Flow Management Tab */
          <FlowManagementPanel 
            parkingLotId={PARKING_LOT_ID} 
            onClose={() => {
              console.log('[Home] Flow management closed, returning to dashboard');
              setActivePanel('dashboard');
            }} 
          />
        )}

        {activePanel === 'ranking' && (
          /* Spot Audit Tab */
          <SpotAuditPanel 
            parkingLotId={PARKING_LOT_ID} 
            onClose={() => {
              console.log('[Home] Spot audit closed, returning to dashboard');
              setActivePanel('dashboard');
            }} 
          />
        )}

        {activePanel === 'history' && (
          /* Report/Events Tab */
          <ReportPanel 
            reportId={activePanel} 
            parkingLotId={PARKING_LOT_ID} 
            onClose={() => {
              console.log('[Home] Report closed, returning to dashboard');
              setActivePanel('dashboard');
            }} 
          />
        )}
      </div>

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

      {/* 3D Visualization - Center */}
      <div className={`w-full h-full transition-opacity duration-300 ${isReportActive ? 'opacity-75' : 'opacity-100'}`}>
        <ParkingLotWithFallback spots={spots} />
      </div>
    </main>
  );
}
