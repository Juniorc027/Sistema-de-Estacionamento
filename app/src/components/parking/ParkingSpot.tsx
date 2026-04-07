/**
 * ParkingSpot — Sensor individual de vaga (marcador de chão 3D)
 *
 * Dimensões: [2.5 × 0.2 × 4.5] (X, Y, Z)
 * Cores:  #00ff00 (livre)  |  #ff0000 (ocupado)
 * Transição suave via Color.lerp a cada frame
 *
 * Elementos visuais:
 *   - Laje colorida (corpo da vaga)
 *   - Linhas brancas de demarcação (esquerda, direita, fundo)
 *   - Esfera do sensor IR no lado fechado
 */
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MeshStandardMaterial } from 'three';
import { ParkingSpotStatus } from '../../types/parking';

/* ── Geometria da vaga ── */
const W = 2.5;            // largura (X)
const H = 0.2;            // espessura (Y)
const D = 4.5;            // profundidade (Z)
const LINE_T = 0.06;      // espessura das demarcações

const COLOR_FREE = new Color('#00ff00');
const COLOR_OCCUPIED = new Color('#ff0000');

interface ParkingSpotProps {
  position: [number, number, number];
  status: ParkingSpotStatus;
  spotNumber: string;
  /** 'south' = abertura para +Z (vagas de cima/meio) | 'north' = abertura para −Z (vagas de baixo) */
  faceDirection?: 'south' | 'north';
}

export function ParkingSpot({
  position,
  status,
  spotNumber,
  faceDirection = 'south',
}: ParkingSpotProps) {
  const matRef = useRef<MeshStandardMaterial>(null);
  const sensorMatRef = useRef<MeshStandardMaterial>(null);

  const targetColor = useMemo(
    () => (status === ParkingSpotStatus.Occupied ? COLOR_OCCUPIED : COLOR_FREE),
    [status],
  );

  /* Transição suave — lerp 7% por frame (~60 fps ≈ 0.5s para completar) */
  useFrame(() => {
    if (matRef.current) {
      matRef.current.color.lerp(targetColor, 0.07);
      matRef.current.emissive.lerp(targetColor, 0.07);
    }
    if (sensorMatRef.current) {
      sensorMatRef.current.color.lerp(targetColor, 0.07);
      sensorMatRef.current.emissive.lerp(targetColor, 0.07);
    }
  });

  const initHex = status === ParkingSpotStatus.Occupied ? '#ff0000' : '#00ff00';
  const backZ = faceDirection === 'north' ? D / 2 : -D / 2;
  const sensorZ = faceDirection === 'north' ? D / 2 - 0.5 : -D / 2 + 0.5;

  return (
    <group position={position}>
      {/* ── Laje colorida ── */}
      <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial
          ref={matRef}
          color={initHex}
          emissive={initHex}
          emissiveIntensity={0.25}
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>

      {/* ── Demarcações brancas ── */}
      {/* Esquerda */}
      <mesh position={[-W / 2, H + 0.005, 0]}>
        <boxGeometry args={[LINE_T, 0.02, D]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Direita */}
      <mesh position={[W / 2, H + 0.005, 0]}>
        <boxGeometry args={[LINE_T, 0.02, D]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Fundo (lado fechado) */}
      <mesh position={[0, H + 0.005, backZ]}>
        <boxGeometry args={[W, 0.02, LINE_T]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* ── Sensor IR ── */}
      <mesh position={[0, H + 0.18, sensorZ]}>
        <sphereGeometry args={[0.1, 14, 14]} />
        <meshStandardMaterial
          ref={sensorMatRef}
          color={initHex}
          emissive={initHex}
          emissiveIntensity={1.2}
        />
      </mesh>
    </group>
  );
}
