# 🎬 Exemplo Prático: Acionando Sensor 7

## O que você verá acontecer (passo a passo)

### 1️⃣ Você aciona o sensor 7 (coloca o dedo na maquete)

```
MAQUETE FÍSICA (ESP32)
├─ Sensor 7 detecta: D0 = LOW (ocupado)
├─ Serial Monitor mostra: 
│  └─ [Sensor] Mudança na vaga 7 -> ocupada
├─ Publica no MQTT:
│  └─ Topic: parking/spots/7
│     Payload: {"vagaId":7,"status":"ocupada","parkingLotId":"45fc18f2..."}
└─ LED IR acende (indicação física)
```

### 2️⃣ Backend recebe e processa

```
BACKEND .NET 8 (Docker)
├─ MqttService.HandleAsync() recebe mensagem
├─ MqttToSignalRHandler.cs (linha 25-40):
│  ├─ Deserializa: { vagaId: 7, status: "ocupada" }
│  ├─ Converte: vagaId=7 → spotNumber="007" (padding)
│  ├─ Atualiza BD: ParkingSpot.Status = Occupied
│  └─ Log: [MQTT] Status transition for spot 007: Free → Occupied
├─ Envia via SignalR (linha 95):
│  └─ SpotUpdated { spotNumber: "007", status: 1, ... }
└─ Log: [MqttHandler] Spot updated: lot 45fc18f2... spot 007 -> Occupied
```

### 3️⃣ Frontend recebe e atualiza

```
FRONTEND NEXT.JS 14 (DevTools Console)
├─ signalRService recebe: SpotUpdated
├─ page.tsx (handleSpotUpdated) processa:
│  ├─ Log: [Home] SpotUpdated event received: { spotNumber: "007", status: 1 }
│  ├─ Log: [Home] Event spotNumber: 007 type: string
│  ├─ normalizeSpotNumber("007") = "007"
│  ├─ Log: [Home] Normalized spotNumber: 007
│  │
│  ├─ setSpots itera sobre vagas:
│  │  ├─ spot 001: normalizeSpotNumber("001") = "001" ≠ "007" ❌ skip
│  │  ├─ spot 002: normalizeSpotNumber("002") = "002" ≠ "007" ❌ skip
│  │  ├─ spot 003: normalizeSpotNumber("003") = "003" ≠ "007" ❌ skip
│  │  ├─ ...
│  │  ├─ spot 007: normalizeSpotNumber("007") = "007" === "007" ✅ MATCH!
│  │  │  ├─ Log: [Home] ✅ MATCH! Updating spot 007 status: 0 → 1
│  │  │  └─ Retorna: { ...spot, status: Occupied }
│  │  └─ ...
│  │
│  └─ Re-render ParkingLot com spots atualizados
│
└─ Console mostra:
   [Home] SpotUpdated event received: {parkingLotId: "45fc18f2...", spotId: "xyz...", spotNumber: "007", status: 1, timestamp: "2026-05-12T14:30:00Z"}
   [Home] Event spotNumber: 007 type: string
   [Home] Normalized spotNumber: 007
   [Home] Comparing spot: 007 with event: 007 match: true
   [Home] ✅ MATCH! Updating spot 007 status: 0 → 1
```

### 4️⃣ React Three Fiber renderiza mudança

```
3D SCENE COMPONENT (ParkingSpot.tsx)
├─ Status muda: Free → Occupied
├─ targetColor = #ff0000 (vermelho)
├─ useFrame() anima transição:
│  ├─ Frame 1: color ≈ #00cc00 (verde claro)
│  ├─ Frame 2: color ≈ #00aa11 (verde escuro)
│  ├─ Frame 3: color ≈ #aa6600 (marrom)
│  ├─ Frame 4: color ≈ #ff3300 (laranja-vermelho)
│  └─ Frame 5: color = #ff0000 (vermelho puro) ✅
│
├─ Renderização de elementos:
│  ├─ Laje: Color.lerp() anima suavemente
│  ├─ Sensor IR: emissiveIntensity aumenta com cor vermelha
│  └─ Número "007": Renderizado em branco acima
│
└─ Resultado visual: Vaga muda de verde para vermelho suavemente
```

### 5️⃣ Você vê no 3D (resultado final)

```
VISUALIZAÇÃO 3D NO NAVEGADOR
┌─────────────────────────────────────────┐
│                 SAÍDA                   │
│    [15] [16] [17] [18] [19] [20]       │
│                                         │
│    [7]  [8]  [9]  [10] [11] [12]      │
│          [13] [14] (CENTRO)            │
│                                         │
│    [1]  [2]  [3]  [4]  [5]  [6]       │
│    ↑↑↑ ENTRADA ↑↑↑                     │
│                                         │
│  🟩 = Livre (verde)                     │
│  🟥 = Ocupado (vermelho)                │
│                                         │
│  Vaga 7 (ANTES):                        │
│   ┌─────────────┐                       │
│   │     007     │ ← Número branco       │
│   │ 🟩 (VERDE)  │ ← Laje livre          │
│   │  [sensor]   │                       │
│   └─────────────┘                       │
│                                         │
│  Vaga 7 (DEPOIS - animação 0.5s):      │
│   ┌─────────────┐                       │
│   │     007     │ ← Número branco       │
│   │ 🟥 (VERMEL) │ ← Laje ocupada        │
│   │  [sensor]   │                       │
│   └─────────────┘                       │
│   ✨ Transição suave (7% por frame)    │
│                                         │
└─────────────────────────────────────────┘

Status bar (topo):
┌────────────────────────────┐
│ 🟢 Tempo Real Ativo        │
│ Vagas livres: 18           │ ← Decrementa
│ Vagas ocupadas: 2          │ ← Incrementa
└────────────────────────────┘
```

---

## 🔍 Console DevTools (F12)

```javascript
// Você verá exatamente isto:

[Home] Loaded spots (normalized): 001:0, 002:0, 003:0, 004:0, 005:0, 006:0, 007:0, 008:0, 009:0, 010:0, 011:0, 012:0, 013:0, 014:0, 015:0, 016:0, 017:0, 018:0, 019:0, 020:0

// [quando você aciona sensor 7]

[Home] SpotUpdated event received: {
  parkingLotId: "45fc18f2-bdd8-4b11-b964-f8face1147f0"
  spotId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  spotNumber: "007"
  status: 1
  timestamp: "2026-05-12T14:30:45.123Z"
}

[Home] Event spotNumber: 007 type: string
[Home] Normalized spotNumber: 007
[Home] Comparing spot: 001 with event: 007 match: false
[Home] Comparing spot: 002 with event: 007 match: false
[Home] Comparing spot: 003 with event: 007 match: false
[Home] Comparing spot: 004 with event: 007 match: false
[Home] Comparing spot: 005 with event: 007 match: false
[Home] Comparing spot: 006 with event: 007 match: false
[Home] Comparing spot: 007 with event: 007 match: true
[Home] ✅ MATCH! Updating spot 007 status: 0 → 1
[Home] Comparing spot: 008 with event: 007 match: false
...
```

---

## 📊 Backend Logs (docker logs)

```
[MQTT] ========== Processing: parking/spots/7 ==========
[MQTT] Payload: {"vagaId":7,"status":"ocupada","parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","device":"esp32-parking-01","uptime_s":120}
[MqttHandler] Could not resolve vagaId. Topic: parking/spots/7, Payload: {"vagaId":7,...}
[MQTT] Status transition for spot 007: Free → Occupied
[MQTT] Session management completed for spot 007
[MqttHandler] Spot updated and broadcasted: lot 45fc18f2... spot 007 -> Occupied (from Free)
[Dashboard RT] Real-time update triggered for lot 45fc18f2-bdd8-4b11-b964-f8face1147f0 (entry/exit event)
[Dashboard RT] Broadcast sent: Occupancy=5.0% (1/20)
```

---

## ✅ Confirmação Visual

- [ ] Vaga 007 renderiza em **posição ENTRADA** (z=+10, perto da guarita verde)
- [ ] Número **"007" visível** em branco acima da laje
- [ ] Cor muda: **verde → vermelho** (suave, 0.5s)
- [ ] Console mostra: `✅ MATCH! Updating spot 007`
- [ ] Status bar atualiza: **Livres: 19, Ocupadas: 1**
- [ ] Sensor IR emite brilho vermelho
- [ ] Re-render completo em < 100ms

---

## 🚀 Testes Adicionais

### Testar com sensor 1
```
Expected: Vaga 1 muda (primeira da fileira ENTRADA)
Console: [Home] ✅ MATCH! Updating spot 001
```

### Testar com sensor 20
```
Expected: Vaga 20 muda (última da fileira SAÍDA)
Console: [Home] ✅ MATCH! Updating spot 020
```

### Testar múltiplas vagas
```
1. Acione sensor 7 (veja muda)
2. Acione sensor 13 (veja ambas mudarem)
3. Desacione sensor 7 (veja voltar ao verde)
Console deve mostrar 3 eventos com ✅ MATCH!
```

---

## 🎯 Sucesso = Quando você vir isto

```
┌─────────────────────────────────────────┐
│ VOCÊ:                                   │
│ 1. Aciona sensor 7 na maquete          │
│ 2. Vê número "007" em branco no 3D     │
│ 3. Vê cor mudar de verde para vermelho │
│ 4. Vê console: ✅ MATCH!               │
│ 5. Vê status bar atualizar             │
│                                         │
│ SIM? ✅ TUDO FUNCIONANDO!              │
│ NÃO? ❌ Verifique troubleshooting      │
└─────────────────────────────────────────┘
```

---

**Tempo esperado: 0.5s (animação) + 50ms (rede) = ~550ms total**
