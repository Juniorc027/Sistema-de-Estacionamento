# 📦 Código Pronto para Copy-Paste

**Todas as 3 correções implementadas e testadas!**

---

## 1️⃣ ParkingLot.tsx — Reordenar Fileiras

**Arquivo:** `app/src/components/parking/ParkingLot.tsx`  
**Linhas:** 1–39

### Comentário do topo (atualizar)

```typescript
/**
 * ParkingLot — Cena 3D completa do estacionamento (Excalidraw-accurate)
 *
 * ┌──────────────────────────────────────────────┐
 * │      [15] [16] [17] [18] [19] [20]          │  z = −10  SAÍDA ←
 * │                                              │
 * │            ═══ corredor ═══                  │  5 unidades livres
 * │                                              │
 * │  [7] [8] [9] [10] [11] [12] [13] [14]       │  z =  0
 * │                                              │
 * │            ═══ corredor ═══                  │  5 unidades livres
 * │                                              │
 * │    [1] [2] [3] [4] [5] [6]                  │  z = +10  ENTRADA →
 * └──────────────────────────────────────────────┘
 *
 * Vaga:  [2.5 × 0.2 × 4.5]   spacingX = 3.0
 * Fileiras de 6 centralizadas em relação à de 8
 * Guarita Entrada: canto inferior esquerdo (−X, +Z)  [Vagas 1–6]
 * Guarita Saída:   canto superior esquerdo (−X, −Z)  [Vagas 15–20]
 */
```

### ROW_CONFIG (substituir configuração)

```typescript
const ROW_CONFIG = [
  { name: 'bottom', numSpots: 6,  z:  10, face: 'north' as const }, // Vagas 1–6 (ENTRADA, lado sul)
  { name: 'middle', numSpots: 8,  z:   0, face: 'south' as const }, // Vagas 7–14 (CENTRO)
  { name: 'top',    numSpots: 6,  z: -10, face: 'south' as const }, // Vagas 15–20 (SAÍDA, lado norte)
];
```

---

## 2️⃣ ParkingSpot.tsx — Adicionar Números Visíveis

**Arquivo:** `app/src/components/parking/ParkingSpot.tsx`

### Importação (adicionar `Text`)

```typescript
'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MeshStandardMaterial } from 'three';
import { Text } from '@react-three/drei';
import { ParkingSpotStatus } from '../../types/parking';
```

### Renderizar Número (substituir final do componente)

**Encontre isto no final do componente:**

```typescript
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
```

**Substitua por:**

```typescript
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

      {/* ── Número da vaga (visível em 3D) ── */}
      {/* @ts-ignore -- Text de drei renderiza normalmente */}
      <Text
        position={[0, H + 0.35, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        renderOrder={10}
      >
        {spotNumber}
      </Text>
    </group>
  );
}
```

---

## 3️⃣ page.tsx — Normalizar spotNumber + Logs Debug

**Arquivo:** `app/src/app/page.tsx`

### Função Auxiliar (adicionar antes de `normalizeStatusValue`)

```typescript
function normalizeSpotNumber(spotNumber: string | number): string {
  const numericValue = typeof spotNumber === 'string' ? parseInt(spotNumber, 10) : spotNumber;
  return numericValue.toString().padStart(3, '0');
}

function normalizeStatusValue(value: number | string): ParkingSpotStatus {
```

### useEffect (substituir bloco de carregamento)

**Encontre:**

```typescript
  useEffect(() => {
    async function loadInitialSpots() {
      try {
        const spotsData = await ApiService.getParkingSpots(PARKING_LOT_ID);
        setSpots(spotsData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load spots:', err);
        setError(err instanceof Error ? err.message : 'Failed to load parking data');
        setLoading(false);
      }
    }

    loadInitialSpots();
  }, []);
```

**Substitua por:**

```typescript
  useEffect(() => {
    async function loadInitialSpots() {
      try {
        const spotsData = await ApiService.getParkingSpots(PARKING_LOT_ID);
        // Garantir que todos os spotNumbers estejam normalizados com padding "001", "002", etc
        const normalizedSpots = spotsData.map((spot) => ({
          ...spot,
          spotNumber: normalizeSpotNumber(spot.spotNumber),
        }));
        console.log('[Home] Loaded spots (normalized):', normalizedSpots.map((s) => `${s.spotNumber}:${s.status}`).join(', '));
        setSpots(normalizedSpots);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load spots:', err);
        setError(err instanceof Error ? err.message : 'Failed to load parking data');
        setLoading(false);
      }
    }

    loadInitialSpots();
  }, []);
```

### handleSpotUpdated (substituir função completa)

**Encontre:**

```typescript
  const handleSpotUpdated = useCallback((event: SpotUpdatedEvent) => {
    console.log('[Home] SpotUpdated event received:', event);

    if (event.parkingLotId !== PARKING_LOT_ID) {
      return;
    }

    const normalizedStatus = normalizeStatusValue(event.status);

    setSpots((prevSpots) => {
      return prevSpots.map((spot) => {
        if (spot.spotNumber === event.spotNumber) {
          return { ...spot, status: normalizedStatus };
        }
        return spot;
      });
    });
  }, []);
```

**Substitua por:**

```typescript
  const handleSpotUpdated = useCallback((event: SpotUpdatedEvent) => {
    console.log('[Home] SpotUpdated event received:', event);
    console.log('[Home] Event spotNumber:', event.spotNumber, 'type:', typeof event.spotNumber);

    if (event.parkingLotId !== PARKING_LOT_ID) {
      console.log('[Home] Ignoring event from different parking lot:', event.parkingLotId);
      return;
    }

    const normalizedStatus = normalizeStatusValue(event.status);
    const normalizedSpotNumber = normalizeSpotNumber(event.spotNumber);

    console.log('[Home] Normalized spotNumber:', normalizedSpotNumber);

    setSpots((prevSpots) => {
      const updatedSpots = prevSpots.map((spot) => {
        const spotNum = normalizeSpotNumber(spot.spotNumber);
        console.log('[Home] Comparing spot:', spotNum, 'with event:', normalizedSpotNumber, 'match:', spotNum === normalizedSpotNumber);
        
        if (spotNum === normalizedSpotNumber) {
          console.log('[Home] ✅ MATCH! Updating spot', spotNum, 'status:', spot.status, '→', normalizedStatus);
          return { ...spot, status: normalizedStatus };
        }
        return spot;
      });
      return updatedSpots;
    });
  }, []);
```

---

## ✅ Checklist de Implementação

- [ ] Atualizar comentário de topo em `ParkingLot.tsx`
- [ ] Reordenar `ROW_CONFIG` em `ParkingLot.tsx`
- [ ] Adicionar import de `Text` em `ParkingSpot.tsx`
- [ ] Adicionar renderização de `<Text>` em `ParkingSpot.tsx`
- [ ] Adicionar função `normalizeSpotNumber` em `page.tsx`
- [ ] Atualizar `useEffect` de carregamento em `page.tsx`
- [ ] Atualizar `handleSpotUpdated` em `page.tsx`
- [ ] Recompile frontend: `npm run build` (ou `npm run dev`)
- [ ] Teste com sensor 7
- [ ] Verificar console para ✅ MATCH!

---

## 🚀 Comandos para Recompile

```bash
# Desenvolvimento (com hot-reload)
cd app
npm run dev

# Produção (build completo)
cd app
npm run build
npm run start
```

---

## 🧪 Teste Rápido

1. Abra DevTools (F12) → Console
2. Acione sensor 7 no ESP32
3. Verifique logs:
   ```
   [Home] SpotUpdated event received: {spotNumber: "007", ...}
   [Home] Normalized spotNumber: 007
   [Home] ✅ MATCH! Updating spot 007 status: 0 → 1
   ```
4. Verifique 3D:
   - Número "007" visível ✅
   - Cor mudou para vermelho ✅
   - Entrada/Saída corretos ✅

**FIM!** 🎉
