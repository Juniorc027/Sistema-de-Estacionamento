/**
 * ============================================================
 *  ParkingSpot Component — Vaga 3D individual
 * ============================================================
 */

'use client';

import { useRef } from 'react';
import { Mesh } from 'three';
import { ParkingSpotStatus } from '../types/parking';
import { Text } from '@react-three/drei';

interface ParkingSpotProps {
  position: [number, number, number];
  spotNumber: string;
  status: ParkingSpotStatus;
  width?: number;
  height?: number;
}

export function ParkingSpot({
  position,
  spotNumber,
  status,
  width = 0.5,
  height = 0.8,
}: ParkingSpotProps) {
  const meshRef = useRef<Mesh>(null);

  // Cores baseadas no status
  const getColor = () => {
    switch (status) {
      case ParkingSpotStatus.Free:
        return '#10b981'; // Verde (Tailwind green-500)
      case ParkingSpotStatus.Occupied:
        return '#ef4444'; // Vermelho (Tailwind red-500)
      case ParkingSpotStatus.Reserved:
        return '#f59e0b'; // Amarelo (Tailwind amber-500)
      case ParkingSpotStatus.Maintenance:
        return '#6b7280'; // Cinza (Tailwind gray-500)
      default:
        return '#10b981';
    }
  };

  return (
    <group position={position}>
      {/* Retângulo da vaga */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={getColor()} />
      </mesh>

      {/* Número da vaga (3D text acima) */}
      <Text
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {spotNumber}
      </Text>
    </group>
  );
}
