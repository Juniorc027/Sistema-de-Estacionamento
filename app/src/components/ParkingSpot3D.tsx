'use client';

/**
 * ParkingSpot3D - Representação 3D de uma vaga individual
 */
import { ParkingSpotStatus } from '../types/parking';

interface ParkingSpot3DProps {
  position: [number, number, number]; // [x, y, z]
  status: ParkingSpotStatus;
  spotNumber: string;
}

export function ParkingSpot3D({ position, status, spotNumber }: ParkingSpot3DProps) {
  // Define cor baseada no status
  const getColor = () => {
    switch (status) {
      case ParkingSpotStatus.Free:
        return '#10b981'; // Verde
      case ParkingSpotStatus.Occupied:
        return '#ef4444'; // Vermelho
      case ParkingSpotStatus.Reserved:
        return '#f59e0b'; // Amarelo
      case ParkingSpotStatus.Maintenance:
        return '#6b7280'; // Cinza
      default:
        return '#10b981';
    }
  };

  return (
    <mesh position={position}>
      {/* Caixa baixa representando a vaga */}
      <boxGeometry args={[0.55, 0.1, 1.0]} />
      <meshStandardMaterial color={getColor()} />
    </mesh>
  );
}
