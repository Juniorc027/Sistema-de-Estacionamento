/**
 * ParkingRow — Distribuidor centralizado de vagas em uma fileira
 *
 * Fórmula de centralização:
 *   xPos = (index - (numSpots - 1) / 2) * spacingX
 *
 * Com spotWidth = 2.5 e spotGap = 0.5:
 *   spacingX = 3.0
 *
 * Isso garante que QUALQUER fileira (6 ou 8 vagas) fique
 * perfeitamente centralizada em X = 0, alinhada com as demais.
 *
 * IDs mapeados:
 *   Top:    1–6
 *   Middle: 7–14
 *   Bottom: 15–20
 */
'use client';

import { ParkingSpot as ParkingSpotType } from '../../types/parking';
import { ParkingSpot } from './ParkingSpot';

interface ParkingRowProps {
  /** Array de spots já fatiado para esta fileira */
  spots: ParkingSpotType[];
  /** Posição global do <group> — define o offset Z (corredor) */
  position: [number, number, number];
  /** Quantidade de vagas nesta fileira (6 ou 8) */
  numSpots: number;
  /** Orientação da abertura das vagas */
  faceDirection?: 'south' | 'north';
}

/* ── Constantes de espaçamento ── */
const SPOT_WIDTH = 2.5;
const SPOT_GAP = 0.5;
const SPACING_X = SPOT_WIDTH + SPOT_GAP; // 3.0

export function ParkingRow({
  spots,
  position,
  numSpots,
  faceDirection = 'south',
}: ParkingRowProps) {
  return (
    <group position={position}>
      {spots.map((spot, index) => {
        /* ── Centralização no eixo X ── */
        const xPos = (index - (numSpots - 1) / 2) * SPACING_X;

        return (
          <ParkingSpot
            key={spot.id}
            position={[xPos, 0, 0]}
            status={spot.status}
            spotNumber={spot.spotNumber}
            faceDirection={faceDirection}
          />
        );
      })}
    </group>
  );
}
