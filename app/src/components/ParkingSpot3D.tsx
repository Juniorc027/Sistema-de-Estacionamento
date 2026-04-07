'use client';

/**
 * ParkingSpot3D - Representação 3D de uma vaga individual
 * Com sombras, brilho emissivo baseado no status e bordas
 */
import { useMemo } from 'react';
import { ParkingSpotStatus } from '../types/parking';

interface ParkingSpot3DProps {
  position: [number, number, number];
  status: ParkingSpotStatus;
  spotNumber: string;
}

const SPOT_COLORS: Record<ParkingSpotStatus, { color: string; emissive: string; intensity: number }> = {
  [ParkingSpotStatus.Free]: { color: '#10b981', emissive: '#10b981', intensity: 0.3 },
  [ParkingSpotStatus.Occupied]: { color: '#ef4444', emissive: '#ef4444', intensity: 0.4 },
  [ParkingSpotStatus.Reserved]: { color: '#f59e0b', emissive: '#f59e0b', intensity: 0.3 },
  [ParkingSpotStatus.Maintenance]: { color: '#6b7280', emissive: '#6b7280', intensity: 0.1 },
};

export function ParkingSpot3D({ position, status, spotNumber }: ParkingSpot3DProps) {
  const { color, emissive, intensity } = useMemo(
    () => SPOT_COLORS[status] ?? SPOT_COLORS[ParkingSpotStatus.Free],
    [status],
  );

  return (
    <group position={position}>
      {/* Contorno / borda da vaga */}
      <mesh position={[0, -0.01, 0]} receiveShadow>
        <boxGeometry args={[0.58, 0.02, 1.04]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.9} />
      </mesh>

      {/* Corpo principal da vaga (elevado) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.52, 0.12, 0.96]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={intensity}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      {/* Indicador superior luminoso */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.48, 0.02, 0.92]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={intensity * 1.5}
          roughness={0.2}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}
