/**
 * ParkingLot — Cena 3D completa do estacionamento (Excalidraw-accurate)
 *
 * ┌──────────────────────────────────────────────┐
 * │ SAÍDA ←                                      │
 * │    [1] [2] [3] [4] [5] [6]                  │  z = −10
 * │                                              │
 * │            ═══ corredor ═══                  │  5 unidades livres
 * │                                              │
 * │  [7] [8] [9] [10] [11] [12] [13] [14]       │  z =  0
 * │                                              │
 * │            ═══ corredor ═══                  │  5 unidades livres
 * │                                              │
 * │      [15] [16] [17] [18] [19] [20]          │  z = +10
 * │ ENTRADA →                                    │
 * └──────────────────────────────────────────────┘
 *
 * Vaga:  [2.5 × 0.2 × 4.5]   spacingX = 3.0
 * Fileiras de 6 centralizadas em relação à de 8
 * Guarita Entrada: canto inferior esquerdo (−X, +Z)
 * Guarita Saída:   canto superior esquerdo (−X, −Z)
 */
'use client';

import { useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { ParkingSpot as ParkingSpotType, ParkingSpotStatus } from '../../types/parking';
import { ParkingRow } from './ParkingRow';

/* ═══════════════════════════════════════════════════
   Layout — valores exactos do diagrama Excalidraw
   ═══════════════════════════════════════════════════ */

const ROW_CONFIG = [
  { name: 'top',    numSpots: 6,  z: -10, face: 'south' as const },
  { name: 'middle', numSpots: 8,  z:   0, face: 'south' as const },
  { name: 'bottom', numSpots: 6,  z:  10, face: 'north' as const },
];

/**
 * A fileira mais larga (8 vagas × 3.0 spacing) ocupa 21 unidades de lado a lado.
 * Calçadas e limites são dimensionados a partir disso.
 */
const MAX_ROW_WIDTH = (8 - 1) * 3.0; // 21 — borda a borda dos centros; +2.5 total = 23.5
const HALF_W = (MAX_ROW_WIDTH + 2.5) / 2 + 2; // ~13.75 → arredondado p/ 14
const HALF_D = 15;                               // ±15 no eixo Z (inclui calçada)
const GATE_GAP = 5.5;                            // abertura dos portões(entrada/saída)

/* ═══════════════════════════════════════════════════
   Sub-componentes de cenário
   ═══════════════════════════════════════════════════ */

/** Asfalto de fundo + área interna */
function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[HALF_W * 2 + 8, HALF_D * 2 + 8]} />
        <meshStandardMaterial color="#111122" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[HALF_W * 2, HALF_D * 2]} />
        <meshStandardMaterial color="#1a1a30" roughness={0.9} />
      </mesh>
    </group>
  );
}

/**
 * Sidewalk — Calçada elevada nas bordas extremas do estacionamento.
 * Deixa toda a área central livre para manobra.
 * Aberturas no lado −X nos cantos (Entrada +Z, Saída −Z).
 */
function Sidewalk() {
  const h = 0.2;
  const w = 1.8;
  const mat = { color: '#94a3b8', roughness: 0.85 } as const;

  const edgeX = HALF_W + w / 2;   // 14.9
  const edgeZ = HALF_D + w / 2;   // 15.9

  // Paredes frente/fundo: abertura de GATE_GAP no lado esquerdo (−X)
  const solidLen = edgeX * 2 - GATE_GAP;
  const solidCX = GATE_GAP / 2;   // centro deslocado p/ a direita

  // Parede esquerda: segmento central (aberturas nos dois cantos)
  const leftLen = edgeZ * 2 - GATE_GAP * 2;

  return (
    <group>
      {/* Fundo (z = −edgeZ) */}
      <mesh position={[solidCX, h / 2, -edgeZ]} receiveShadow castShadow>
        <boxGeometry args={[solidLen, h, w]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* Frente (z = +edgeZ) */}
      <mesh position={[solidCX, h / 2, edgeZ]} receiveShadow castShadow>
        <boxGeometry args={[solidLen, h, w]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* Direita (x = +edgeX) — contínua */}
      <mesh position={[edgeX, h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, h, edgeZ * 2]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {/* Esquerda (x = −edgeX) — segmento central */}
      <mesh position={[-edgeX, h / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, h, leftLen]} />
        <meshStandardMaterial {...mat} />
      </mesh>
    </group>
  );
}

/** Guarita — cabine do atendente */
function GuardBooth({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 2.0, 1.8]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.08, 0]} castShadow>
        <boxGeometry args={[2.1, 0.12, 2.1]} />
        <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.2, 0.91]}>
        <planeGeometry args={[1.0, 0.7]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.45} roughness={0.1} />
      </mesh>
    </group>
  );
}

/** Cancela — poste vertical + braço cilíndrico vermelho/branco */
function Barrier({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[2.0, 1.45, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 4.0, 8]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} />
      </mesh>
      {[0.5, 1.5, 2.5, 3.5].map((off, i) => (
        <mesh key={i} position={[off, 1.45, 0.06]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.3, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

/** Faixas amarelas tracejadas entre fileiras (corredores) */
function LaneMarkings() {
  const dashes = 12;
  const dW = 1.0;
  const dGap = 0.7;
  const total = dashes * (dW + dGap);
  const startX = -total / 2 + dW / 2;

  // Z dos corredores (ponto médio entre fileiras, borda-a-borda)
  const upperZ = -5;  // entre top (−10) e middle (0)
  const lowerZ = 5;   // entre middle (0) e bottom (+10)

  const elements: JSX.Element[] = [];
  for (let i = 0; i < dashes; i++) {
    const x = startX + i * (dW + dGap);
    elements.push(
      <mesh key={`u${i}`} position={[x, 0.005, upperZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dW, 0.08]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>,
      <mesh key={`l${i}`} position={[x, 0.005, lowerZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dW, 0.08]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>,
    );
  }
  return <group>{elements}</group>;
}

/** Postes de luz nos quatro cantos */
function LightPosts() {
  const positions: [number, number][] = [
    [-HALF_W + 1, -HALF_D + 2],
    [-HALF_W + 1, HALF_D - 2],
    [HALF_W - 1, -HALF_D + 2],
    [HALF_W - 1, HALF_D - 2],
  ];
  return (
    <group>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 5, 8]} />
            <meshStandardMaterial color="#4a5568" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 5.1, 0]}>
            <sphereGeometry args={[0.2, 14, 14]} />
            <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Iluminação */
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#b0c4de" />
      <directionalLight
        position={[12, 20, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-8, 14, -6]} intensity={0.25} color="#4a90d9" />
      <pointLight position={[-HALF_W, 6, 0]} intensity={0.6} color="#ffeedd" distance={30} />
      <pointLight position={[HALF_W, 6, 0]} intensity={0.6} color="#ffeedd" distance={30} />
    </>
  );
}

/** Tone mapping cinematográfico */
function EffectsInner() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = 2; // ACESFilmicToneMapping
    gl.toneMappingExposure = 1.2;
  }, [gl]);
  return null;
}

/* ═══════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════ */

interface ParkingLotProps {
  spots: ParkingSpotType[];
}

export function ParkingLot({ spots }: ParkingLotProps) {
  /**
   * Distribui os spots nas 3 fileiras.
   * Ordena por spotNumber numérico e fatia:
   *   0–5   → top    (6)   IDs 1-6
   *   6–13  → middle (8)   IDs 7-14
    *   14–19 → bottom (6)   IDs 15-20
   */
  const rows = useMemo(() => {
    const sorted = [...spots].sort(
      (a, b) => parseInt(a.spotNumber) - parseInt(b.spotNumber),
    );
    let offset = 0;
    return ROW_CONFIG.map((cfg) => {
      const slice = sorted.slice(offset, offset + cfg.numSpots);
      offset += cfg.numSpots;
      return { ...cfg, data: slice };
    });
  }, [spots]);

  const freeCount = spots.filter((s) => s.status === ParkingSpotStatus.Free).length;
  const occupiedCount = spots.filter((s) => s.status === ParkingSpotStatus.Occupied).length;

  return (
    <div className="w-full h-screen bg-gray-950 relative">
      <Canvas
        shadows
        camera={{ position: [24, 24, 30], fov: 42, near: 0.1, far: 150 }}
        gl={{ antialias: true }}
      >
        <SceneLighting />
        <EffectsInner />

        <OrbitControls
          target={[0, 0, 0]}
          minDistance={12}
          maxDistance={65}
          maxPolarAngle={Math.PI / 2.15}
          enableDamping
          dampingFactor={0.05}
        />

        {/* ── Cenário ── */}
        <Ground />
        <Sidewalk />
        <LaneMarkings />
        <LightPosts />

        {/* ── Guarita ENTRADA — canto inferior esquerdo (−X, +Z) ── */}
        <group position={[-HALF_W - 1, 0, HALF_D]}>
          <GuardBooth position={[-1.5, 0, 0]} />
          <Barrier position={[0.5, 0, 0]} />
          <Text
            position={[0, 2.8, 0]}
            fontSize={0.6}
            color="#22c55e"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            ENTRADA
          </Text>
        </group>

        {/* ── Guarita SAÍDA — canto superior esquerdo (−X, −Z) ── */}
        <group position={[-HALF_W - 1, 0, -HALF_D]}>
          <GuardBooth position={[-1.5, 0, 0]} />
          <Barrier position={[0.5, 0, 0]} rotation={[0, Math.PI, 0]} />
          <Text
            position={[0, 2.8, 0]}
            fontSize={0.6}
            color="#ef4444"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            SAÍDA
          </Text>
        </group>

        {/* ── 3 Fileiras de vagas (cada uma é um <group> separado) ── */}
        {rows.map((row) => (
          <ParkingRow
            key={row.name}
            spots={row.data}
            position={[0, 0, row.z]}
            numSpots={row.numSpots}
            faceDirection={row.face}
          />
        ))}

        <fog attach="fog" args={['#0a0a1a', 35, 70]} />
      </Canvas>

      {/* ═══ Overlays 2D ═══ */}

      <div className="absolute bottom-6 left-6 bg-gray-800/90 p-4 rounded-xl backdrop-blur-sm border border-gray-700 z-10">
        <h3 className="text-white font-bold mb-3 text-sm">Legenda</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
            <span className="text-white text-xs">Livre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
            <span className="text-white text-xs">Ocupado</span>
          </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 bg-gray-800/90 p-4 rounded-xl backdrop-blur-sm border border-gray-700 z-10">
        <h3 className="text-white font-bold mb-2 text-sm">Vagas</h3>
        <div className="text-white space-y-1 text-sm">
          <p>Livres: <span className="font-bold text-green-400">{freeCount}</span></p>
          <p>Ocupadas: <span className="font-bold text-red-400">{occupiedCount}</span></p>
          <p>Total: <span className="font-bold">{spots.length}</span></p>
        </div>
      </div>
    </div>
  );
}
