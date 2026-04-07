'use client';

import { useEffect, useMemo, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import ParkingLot2D, { Parking2DSpot, SpotStatus } from '@/components/ParkingLot2D';

const PARKING_LOT_ID = '45fc18f2-bdd8-4b11-b964-f8face1147f0';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5167';
const SIGNALR_URL = process.env.NEXT_PUBLIC_SIGNALR_URL || `${API_URL}/hubs/parking`;

type RawApiSpot = {
  id?: string | number;
  vagaId?: number;
  spotNumber?: string;
  status?: string | number;
  statusDescription?: string;
};

type SignalRSpotPayload = {
  parkingLotId?: string;
  spotId?: string;
  spotNumber?: string;
  status?: string | number;
  vagaId?: number;
};

function normalizeStatus(status: unknown, statusDescription?: unknown): SpotStatus {
  const raw = String(status ?? statusDescription ?? '')
    .trim()
    .toLowerCase();

  if (raw === '1' || raw === 'occupied' || raw === 'ocupada') {
    return 'occupied';
  }

  return 'free';
}

function normalizeSpotId(spot: RawApiSpot): number | null {
  if (typeof spot.vagaId === 'number') {
    return spot.vagaId;
  }

  if (typeof spot.spotNumber === 'string') {
    const parsed = Number.parseInt(spot.spotNumber, 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  if (typeof spot.id === 'number') {
    return spot.id;
  }

  if (typeof spot.id === 'string') {
    const parsed = Number.parseInt(spot.id, 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function toUiSpot(spot: RawApiSpot): Parking2DSpot | null {
  const id = normalizeSpotId(spot);
  if (!id || id < 1 || id > 22) return null;

  return {
    id,
    status: normalizeStatus(spot.status, spot.statusDescription),
  };
}

export default function DashboardTestPage() {
  const [spots, setSpots] = useState<Parking2DSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [lastUpdatedSpotId, setLastUpdatedSpotId] = useState<number | null>(null);

  useEffect(() => {
    const fetchInitialSpots = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_URL}/api/ParkingSpots/by-lot/${PARKING_LOT_ID}`,
          { cache: 'no-store' }
        );

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const payload = await response.json();
        const source = Array.isArray(payload) ? payload : payload?.data;

        if (!Array.isArray(source)) {
          throw new Error('Formato inesperado da resposta da API');
        }

        const normalized = source
          .map((spot: RawApiSpot) => toUiSpot(spot))
          .filter((spot: Parking2DSpot | null): spot is Parking2DSpot => Boolean(spot))
          .sort((a, b) => a.id - b.id);

        setSpots(normalized);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch spots:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar vagas');
        setSpots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialSpots();
  }, []);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_URL)
      .withAutomaticReconnect([0, 2000, 10000])
      .build();

    const joinGroup = async () => {
      await connection.invoke('JoinParkingLot', PARKING_LOT_ID);
    };

    connection.on('SpotUpdated', (event: SignalRSpotPayload) => {
      if (event?.parkingLotId && event.parkingLotId !== PARKING_LOT_ID) {
        return;
      }

      const candidateId =
        typeof event?.vagaId === 'number'
          ? event.vagaId
          : Number.parseInt(event?.spotNumber ?? '', 10);

      if (!Number.isFinite(candidateId) || candidateId < 1 || candidateId > 22) {
        return;
      }

      const nextStatus = normalizeStatus(event?.status);

      setSpots((prev) => {
        const index = prev.findIndex((spot) => spot.id === candidateId);

        if (index === -1) {
          return [...prev, { id: candidateId, status: nextStatus }].sort((a, b) => a.id - b.id);
        }

        if (prev[index].status === nextStatus) {
          return prev;
        }

        const updated = [...prev];
        updated[index] = { ...updated[index], status: nextStatus };
        return updated;
      });

      setLastUpdatedSpotId(candidateId);
      setTimeout(() => setLastUpdatedSpotId((current) => (current === candidateId ? null : current)), 700);
    });

    connection.onclose(() => {
      setIsRealtimeConnected(false);
    });

    connection.onreconnected(() => {
      setIsRealtimeConnected(true);
    });

    connection
      .start()
      .then(async () => {
        await joinGroup();
        setIsRealtimeConnected(true);
      })
      .catch((err) => {
        console.error('[SignalR] Connection failed:', err);
        setIsRealtimeConnected(false);
      });

    connection.onreconnected(async () => {
      await joinGroup();
      setIsRealtimeConnected(true);
    });

    return () => {
      connection.invoke('LeaveParkingLot', PARKING_LOT_ID).catch(() => undefined);
      connection.stop().catch(() => undefined);
    };
  }, []);

  const counters = useMemo(() => {
    const occupied = spots.filter((spot) => spot.status === 'occupied').length;
    const free = spots.length - occupied;
    return { total: spots.length, free, occupied };
  }, [spots]);

  return (
    <div className="min-h-screen bg-[#0b0e17] px-4 py-8 text-white">
      <main className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-xl border border-white/10 bg-gray-900/40 p-5">
          <h1 className="text-xl font-bold">Painel 2D — Estacionamento Inteligente</h1>
          <p className="mt-1 text-sm text-gray-400">
            Estado em tempo real das vagas via API + SignalR.
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="rounded-md border border-white/10 px-3 py-1.5">
              Total: <strong>{counters.total}</strong>
            </span>
            <span className="rounded-md border border-green-500/40 px-3 py-1.5 text-green-300">
              Livres: <strong>{counters.free}</strong>
            </span>
            <span className="rounded-md border border-red-500/40 px-3 py-1.5 text-red-300">
              Ocupadas: <strong>{counters.occupied}</strong>
            </span>
            <span
              className={`rounded-md border px-3 py-1.5 ${
                isRealtimeConnected
                  ? 'border-green-500/40 text-green-300'
                  : 'border-yellow-500/40 text-yellow-300'
              }`}
            >
              Tempo real: {isRealtimeConnected ? 'Online' : 'Conectando'}
            </span>
          </div>
        </header>

        {loading ? (
          <section className="rounded-xl border border-white/10 bg-gray-900/40 p-6 text-sm text-gray-300">
            Carregando vagas...
          </section>
        ) : error ? (
          <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            Falha ao carregar dados reais: {error}
          </section>
        ) : spots.length === 0 ? (
          <section className="rounded-xl border border-white/10 bg-gray-900/40 p-6 text-sm text-gray-300">
            Nenhuma vaga encontrada para este estacionamento.
          </section>
        ) : (
          <ParkingLot2D spots={spots} lastUpdatedSpotId={lastUpdatedSpotId} />
        )}
      </main>
    </div>
  );
}
