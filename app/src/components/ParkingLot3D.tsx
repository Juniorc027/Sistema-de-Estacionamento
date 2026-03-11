/**
 * ParkingLot3D - Cena 3D completa do estacionamento
 * Layout: 70cm×50cm → 7×5 unidades
 * 10 vagas superiores (001-010) | Corredor | 10 vagas inferiores (011-020)
 */
'use client';

import { Canvas } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { ParkingSpot3D } from './ParkingSpot3D';
import { ParkingSpot, ParkingSpotStatus } from '../types/parking';

interface ParkingLot3DProps {
  spots: ParkingSpot[];
}

/**
 * Calcula posição 3D baseado no número da vaga
 * Layout: 7 unidades largura × 5 unidades altura
 */
function calculateSpotPosition(spotNumber: string): [number, number, number] {
  const num = parseInt(spotNumber, 10);

  // Configurações de layout
  const spotWidth = 0.6; // Largura de cada vaga
  const spotDepth = 1.0; // Profundidade da vaga
  const startX = -3.0; // Início no eixo X (centralizado)
  const corridorWidth = 0.6; // Largura do corredor central
  const rowOffsetZ = (spotDepth / 2) + (corridorWidth / 2); // Distância do centro até a linha

  // Linha superior (vagas 1-10): Z positivo
  if (num >= 1 && num <= 10) {
    const indexInRow = num - 1;
    return [
      startX + indexInRow * spotWidth,
      0.05, // Altura (y) baixa
      rowOffsetZ, // Z positivo
    ];
  }

  // Linha inferior (vagas 11-20): Z negativo
  if (num >= 11 && num <= 20) {
    const indexInRow = num - 11;
    return [
      startX + indexInRow * spotWidth,
      0.05,
      -rowOffsetZ, // Z negativo
    ];
  }

  // Fallback (não deve ocorrer)
  return [0, 0, 0];
}

export function ParkingLot3D({ spots }: ParkingLot3DProps) {
  const freeCount = spots.filter(s => s.status === ParkingSpotStatus.Free).length;
  const occupiedCount = spots.filter(s => s.status === ParkingSpotStatus.Occupied).length;

  return (
    <div className="w-full h-screen bg-gray-900">
      <Canvas>
        {/* Câmera Ortográfica - Visão Superior Fixa */}
        <OrthographicCamera
          makeDefault
          position={[0, 10, 0]} // Acima da cena
          rotation={[-Math.PI / 2, 0, 0]} // Olhando para baixo
          zoom={80}
        />

        {/* Iluminação */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />

        {/* Plano Base (Asfalto) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[8, 6]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>

        {/* Corredor Central */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[7, 0.6]} />
          <meshStandardMaterial color="#374151" />
        </mesh>

        {/* Renderizar todas as vagas */}
        {spots.map((spot) => {
          const position = calculateSpotPosition(spot.spotNumber);
          return (
            <ParkingSpot3D
              key={spot.id}
              position={position}
              status={spot.status}
              spotNumber={spot.spotNumber}
            />
          );
        })}
      </Canvas>

      {/* Legenda (overlay 2D sobre o canvas 3D) */}
      <div className="absolute bottom-8 left-8 bg-gray-800/90 p-4 rounded-lg">
        <h3 className="text-white font-bold mb-3">Legenda</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-white text-sm">Livre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-white text-sm">Ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-white text-sm">Reservado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span className="text-white text-sm">Manutenção</span>
          </div>
        </div>
      </div>

      {/* Contador de vagas */}
      <div className="absolute top-8 right-8 bg-gray-800/90 p-4 rounded-lg">
        <h3 className="text-white font-bold mb-2">Vagas</h3>
        <div className="text-white space-y-1">
          <p>
            Livres: <span className="font-bold text-green-400">{freeCount}</span>
          </p>
          <p>
            Ocupadas: <span className="font-bold text-red-400">{occupiedCount}</span>
          </p>
          <p>
            Total: <span className="font-bold">{spots.length}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
