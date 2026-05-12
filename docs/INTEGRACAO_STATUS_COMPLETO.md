# 📊 Status Integração MQTT ↔ SignalR ↔ Frontend

## 🟢 O QUE ESTÁ FUNCIONANDO

### Backend .NET
```
✅ MQTT conectado em 192.168.15.177:1884
✅ Inscrito em: parking/spots, parking/events, parking/entry, parking/exit, parking/device/+/status  
✅ Recebendo mensagens da ESP32 continuamente
✅ Disparando SignalR broadcasts: [MqttHandler] Spot updated and broadcasted
✅ Docker build passou sem erros
```

**Prova dos logs:**
```
[23:25:40] MQTT subscribed to: parking/spots, parking/spots/+, parking/events, parking/entry, parking/exit, parking/device/+/status
[23:25:40] [MqttHandler] Spot updated and broadcasted: lot 45fc18f2-bdd8-4b11-b964-f8face1147f0 spot 001 -> Free
[23:25:40] [MqttHandler] Spot updated and broadcasted: lot 45fc18f2-bdd8-4b11-b964-f8face1147f0 spot 002 -> Free
...
```

---

### ESP32 (Hardware)
```
✅ WiFi conectada (VIVOFIBRA-WIFI6-E9D8)
✅ MQTT conectada ao broker
✅ I2C detectando MCP23017 (0x20 e 0x21)
✅ Sensores I2C respondendo (█ pattern mudando)
✅ Publicando dados continuamente em parking/spots
```

**Prova (Serial Monitor):**
```
╔══ LEITURA ULTRA-VERBOSA ════════════════════════════════════╗
║ MCP1 (0x20): ██□□□□□□□□□□□□□□  ║  ← Vagas mudando
║ MCP2 Vagas:  □□□□    ║
║ Sensores:    Ent:○(raw:H) Sai:○(raw:H)  ║
╚════════════════════════════════════════════════════════════════╝
```

---

### Frontend (React)
```
✅ Next.js rodando em http://localhost:3000
✅ SignalR service configurado com HUB_URL
✅ Hook useSignalR criado
✅ Listeners para SpotUpdated e UpdateDashboardStats definidos
```

---

## 🟡 O QUE PRECISA SER TESTADO

### 1. Frontend SignalR Connection Status
**Teste no Browser Console:**
```javascript
// Abrir DevTools (F12) e colar:
console.log('🔍 SignalR Status:');
console.log('  State:', window.signalRConnection?.state ?? 'undefined');
console.log('  Connection ID:', window.signalRConnection?.connectionId ?? 'undefined');
```

**Esperado:**
```
🔍 SignalR Status:
  State: 1  ✅ (1 = Connected)
  Connection ID: "V4IfzklFnU2RjvxdUYmsZw"  ✅
```

---

### 2. Listeners Estão Registrados?
**Teste no Browser Console:**
```javascript
// Registrar listeners manualmente e testar
window.signalRConnection?.on('SpotUpdated', (data) => {
    console.log('✅ [SpotUpdated] Eventos chegando!', data);
});

window.signalRConnection?.on('UpdateDashboardStats', (data) => {
    console.log('✅ [UpdateDashboardStats] Chegou!', data);
});
```

---

### 3. Teste End-to-End: MQTT → Backend → SignalR → Frontend

**Terminal (publicar mensagem de teste):**
```bash
mosquitto_pub -h 192.168.15.177 -p 1884 \
  -u parking_iot -P ParkingIot@2026 \
  -t parking/spots \
  -m '{"spots":[{"id":1,"occupied":true},{"id":2,"occupied":false}]}'
```

**O que deve acontecer:**
1. 📤 Mensagem publicada em MQTT
2. 📥 Backend recebe: `[MQTT] mensagem recebida: parking/spots`
3. 🔄 Backend processa: `[MqttHandler] Spot updated and broadcasted`
4. 📡 Backend envia SignalR: `connection.SendAsync("SpotUpdated", ...)`
5. ✨ Frontend recebe: `✅ [SpotUpdated]` no Console

**Verificar logs:**
```bash
# Terminal 1: Monitor backend
docker logs -f parking-backend | grep -i "mqtt\|broadcast"

# Terminal 2: Executar teste
mosquitto_pub -h 192.168.15.177 -p 1884 \
  -u parking_iot -P ParkingIot@2026 \
  -t parking/spots \
  -m '{"spots":[{"id":1,"occupied":true}]}'

# Terminal 3: No Console do Browser (F12)
# Procurar por: ✅ [SpotUpdated]
```

---

## 🔴 PROBLEMAS POSSÍVEIS

### ❌ Frontend não vê eventos
**Checklist:**
1. [ ] Abrir DevTools (F12) → Console
2. [ ] Executar: `console.log(window.signalRConnection?.state)`
3. [ ] Se for `undefined` → Frontend NÃO está criando conexão
4. [ ] Se for `0` ou `2` → Frontend está desconectado ou conectando
5. [ ] Se for `1` → Conexão OK, problema é nos listeners

---

### ❌ Network não mostra /hubs/parking/negotiate
**Ação:**
1. Abrir DevTools → Network tab
2. Recarregar página (F5)
3. Procurar por `negotiate`
4. Se não aparecer → Frontend não tentou conectar ao SignalR

---

### ❌ Backend não envia broadcasts
**Ação:**
```bash
docker logs parking-backend | grep -i "broadcast"
# Se não aparecer nada → backend não está disparando
```

---

## 📋 Próximos Passos

### Imediato (teste agora):
1. Abrir http://localhost:3000 no browser
2. Abrir DevTools (F12)
3. Executar no Console:
   ```javascript
   console.log(window.signalRConnection?.state)
   ```
4. **Reportar o valor** (0, 1, 2, ou undefined)

### Se mostrar `1` (Conectado):
```javascript
// Registrar listeners e ver se eventos chegam
window.signalRConnection?.on('SpotUpdated', (data) => {
    console.log('✅ CHEGOU:', data);
});
```

### Se mostrar `undefined`:
Frontend não criou conexão SignalR → Verificar `app/src/services/signalr.ts` linha 7

---

## 🔧 Configurações Críticas

### Frontend env (app/.env.local)
```env
NEXT_PUBLIC_SIGNALR_URL=http://localhost:5167/hubs/parking
NEXT_PUBLIC_API_URL=http://localhost:5167
```

✅ **Já configurado?** Verificar em:
```bash
cat app/.env.local
# ou
grep -r "NEXT_PUBLIC_SIGNALR_URL" app/
```

### Backend CORS (api/src/API/Program.cs)
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", builder =>
    {
        builder
            .WithOrigins("http://localhost:3000")
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});
```

✅ **Verificar:**
```bash
grep -A 10 "AllowFrontend" api/src/API/Program.cs
```

---

## 🚀 Resumo da Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    ESP32 (Hardware)                     │
│  WiFi: VIVOFIBRA-WIFI6-E9D8 (192.168.15.178)          │
│  I2C: MCP1(0x20) + MCP2(0x21) + 20 sensors             │
│  Status: ✅ Lendo sensores continuamente                │
└──────────────┬──────────────────────────────────────────┘
               │
               │ MQTT (QoS 1)
               │ Topic: parking/spots
               │ Broker: 192.168.15.177:1884
               ▼
┌─────────────────────────────────────────────────────────┐
│           Backend .NET (Docker)                          │
│  MqttService: Conectado ✅                              │
│  Topics: parking/spots, parking/events, parking/entry   │
│  MqttToSignalRHandler: Processando ✅                   │
│  SignalR Hub: ParkingHub (localhost:5167/hubs/parking)  │
└──────────────┬──────────────────────────────────────────┘
               │
               │ SignalR (WebSocket/SSE)
               │ Methods: SpotUpdated, UpdateDashboardStats
               │ Groups: parking-lot-{id}
               ▼
┌─────────────────────────────────────────────────────────┐
│           Frontend React (Next.js)                       │
│  URL: http://localhost:3000                             │
│  Service: SignalRService (useSignalR hook)              │
│  Status: ❓ TESTANDO AGORA                              │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Objetivo Final

✅ **Em tempo real**, quando ESP32 detecta mudança:
1. Sensor lê mudança de ocupação
2. ESP32 publica em MQTT (≤500ms)
3. Backend recebe e atualiza BD (≤100ms)
4. Backend envia SignalR (≤50ms)
5. **Frontend renderiza nova UI** (≤200ms)
6. **Total: ~1 segundo** da mudança real até UI atualizar

---

## 📞 Debugging Guide

👉 Veja: [FRONTEND_SIGNALR_DEBUG_GUIDE.md](./FRONTEND_SIGNALR_DEBUG_GUIDE.md)

Instruções detalhadas para:
- Verificar conexão SignalR no Browser
- Monitorar eventos em tempo real
- Testar manualmente MQTT → SignalR
- Solucionar problemas comuns
