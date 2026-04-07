'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

export type SpotStatus = 'free' | 'occupied';

export interface Parking2DSpot {
  id: number;
  status: SpotStatus;
}

interface ParkingLot2DProps {
  spots: Parking2DSpot[];
  lastUpdatedSpotId: number | null;
}

function SpotSquare({
  spot,
  highlight,
}: {
  spot: Parking2DSpot;
  highlight: boolean;
}) {
  const isFree = spot.status === 'free';

  return (
    <motion.div
      layout
      initial={false}
      animate={{
        scale: highlight ? [1, 1.06, 1] : 1,
      }}
      transition={{ duration: 0.35 }}
      className={`flex h-14 w-14 items-center justify-center rounded-md border text-xs font-semibold ${
        isFree
          ? 'border-green-500 bg-green-500/20 text-green-200'
          : 'border-red-500 bg-red-500/20 text-red-200'
      } ${highlight ? 'ring-2 ring-blue-400/80' : ''}`}
      aria-label={`Vaga ${spot.id} ${isFree ? 'livre' : 'ocupada'}`}
    >
      {String(spot.id).padStart(2, '0')}
    </motion.div>
  );
}

export default function ParkingLot2D({
  spots,
  lastUpdatedSpotId,
}: ParkingLot2DProps) {
  const sorted = useMemo(() => [...spots].sort((a, b) => a.id - b.id), [spots]);

  const row1 = sorted.filter((spot) => spot.id >= 1 && spot.id <= 6);
  const row2 = sorted.filter((spot) => spot.id >= 7 && spot.id <= 14);
  const row3 = sorted.filter((spot) => spot.id >= 15 && spot.id <= 22);

  const renderRow = (row: Parking2DSpot[], expectedCount: number) => {
    if (row.length === 0) {
      return (
        <div className="text-xs text-gray-500">
          Nenhuma vaga disponível nesta linha.
        </div>
      );
    }

    return (
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${expectedCount}, minmax(0, 1fr))` }}
      >
        {row.map((spot) => (
          <SpotSquare
            key={spot.id}
            spot={spot}
            highlight={lastUpdatedSpotId === spot.id}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="rounded-xl border border-white/10 bg-gray-900/40 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
          Mapa 2D do Estacionamento
        </h2>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm border border-green-500 bg-green-500/20" />
            Livre
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm border border-red-500 bg-red-500/20" />
            Ocupada
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {renderRow(row1, 6)}
        {renderRow(row2, 8)}
        {renderRow(row3, 8)}
      </div>
    </section>
  );
}
