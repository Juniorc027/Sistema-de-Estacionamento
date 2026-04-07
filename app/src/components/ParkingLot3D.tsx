/**
 * ParkingLot3D - Cena 3D completa do estacionamento
 * Layout: 10 vagas superiores (001-010) | Corredor | 10 vagas inferiores (011-020)
 * Visão isométrica 3D com sombras e iluminação realista
 */
'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ParkingSpot3D } from './ParkingSpot3D';
import { SceneLights } from './SceneLights';
import { Effects } from './Effects';
import { ParkingSpot, ParkingSpotStatus } from '../types/parking';

interface ParkingLot3DProps {
  spots: ParkingSpot[];
}

/**
 * Calcula posição 3D baseado no número da vaga
 */
function calculateSpotPosition(spotNumber: string): [number, number, number] {
  const num = parseInt(spotNumber, 10);

  const spotWidth = 0.6;
  const spotDepth = 1.0;
  const startX = -3.0;
  const corridorWidth = 0.6;
  const rowOffsetZ = (spotDepth / 2) + (corridorWidth / 2);

  // Linha superior (vagas 1-10): Z positivo
  if (num >= 1 && num <= 10) {
    const indexInRow = num - 1;
    return [startX + indexInRow * spotWidth, 0.05, rowOffsetZ];
  }

  // Linha inferior (vagas 11-20): Z negativo
  if (num >= 11 && num <= 20) {
    const indexInRow = num - 11;
    return [startX + indexInRow * spotWidth, 0.05, -rowOffsetZ];
  }

  return [0, 0, 0];
}

export function ParkingLot3D({ spots }: ParkingLot3DProps) {
  const freeCount = spots.filter(s => s.status === ParkingSpotStatus.Free).length;
  const occupiedCount = spots.filter(s => s.status === ParkingSpotStatus.Occupied).length;

  return (
    <div className="w-full h-screen bg-gray-900">
      <Canvas
        shadows
        camera={{
          position: [6, 8, 6],
          fov: 45,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true }}
      >
        {/* Efeitos visuais */}
        <Effects />

        {/* Iluminação 3D */}
        <SceneLights />

        {/* Controles de câmera (arrastar para girar, scroll para zoom) */}
        <OrbitControls
          target={[0, 0, 0]}
          minDistance={4}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.2}
          enableDamping
          dampingFactor={0.05}
        />

        {/* Plano Base (Asfalto) com sombra */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[10, 8]} />
          <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
        </mesh>

        {/* Bordas do estacionamento */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[8, 6]} />
          <meshStandardMaterial color="#16213e" roughness={0.8} />
        </mesh>

        {/* Corredor Central */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <planeGeometry args={[7, 0.6]} />
          <meshStandardMaterial color="#374151" roughness={0.7} />
        </mesh>

        {/* Linhas de demarcação do corredor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0.32]}>
          <planeGeometry args={[6.5, 0.02]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, -0.32]}>
          <planeGeometry args={[6.5, 0.02]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
        </mesh>

        {/* Setas de direção no corredor */}
        {[-2, 0, 2].map((x, i) => (
          <mesh key={`arrow-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.035, 0]}>
            <planeGeometry args={[0.3, 0.15]} />
            <meshStandardMaterial color="#9ca3af" roughness={0.5} />
          </mesh>
        ))}

        {/* Postes de luz 3D */}
        {[-3.5, 3.5].map((x, i) => (
          <group key={`post-${i}`} position={[x, 0, 0]}>
            {/* Poste */}
            <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.04, 3, 8]} />
              <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Luminária topo */}
            <mesh position={[0, 3, 0]}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial
                color="#fef3c7"
                emissive="#fbbf24"
                emissiveIntensity={0.8}
              />
            </mesh>
          </group>
        ))}

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

        {/* Fog para profundidade */}
        <fog attach="fog" args={['#0f172a', 12, 25]} />
      </Canvas>

      {/* Legenda (overlay 2D sobre o canvas 3D) */}
      <div className="absolute bottom-8 left-8 bg-gray-800/90 p-4 rounded-lg backdrop-blur-sm border border-gray-700">
        <h3 className="text-white font-bold mb-3">Legenda</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded shadow-lg shadow-green-500/50"></div>
            <span className="text-white text-sm">Livre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded shadow-lg shadow-red-500/50"></div>
            <span className="text-white text-sm">Ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded shadow-lg shadow-yellow-500/50"></div>
            <span className="text-white text-sm">Reservado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded shadow-lg shadow-gray-500/50"></div>
            <span className="text-white text-sm">Manutenção</span>
          </div>
        </div>
      </div>

      {/* Contador de vagas */}
      <div className="absolute top-8 right-8 bg-gray-800/90 p-4 rounded-lg backdrop-blur-sm border border-gray-700">
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
