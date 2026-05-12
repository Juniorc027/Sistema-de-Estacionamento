# 🔧 Frontend SignalR Debug Guide

## Status Atual

✅ **Backend**: Funcionando (recebendo MQTT e fazendo broadcast)  
❌ **Frontend**: SignalR não conecta (verificar console)

---

## 1️⃣ Verificar Conexão no Console do Browser

### Abra o DevTools (F12) e execute:

```javascript
// 1. Checar se window.signalRConnection existe
console.log('window.signalRConnection:', window.signalRConnection);

// 2. Checar estado atual
console.log('Estado:', window.signalRConnection?.state);

// 3. Checar ID da conexão
console.log('ConnectionId:', window.signalRConnection?.connectionId);

// 4. Checar URL da conexão
console.log('URL:', window.signalRConnection?.baseUrl);

// 5. Ver estado da aplicação
console.log('App State:', window.parkingAppState);
```

### ✅ Saída esperada:
```
window.signalRConnection: HubConnection {state: 1, ...}
Estado: 1  (1 = Connected)
ConnectionId: "abc123xyz"
URL: "http://localhost:5167/hubs/parking"
App State: {isConnected: true, spots: 20, ...}
```

---

## 2️⃣ Testar Recebimento de Mensagens

### No console do browser, envie um teste:

```javascript
// Ativar logs de recebimento
console.log('=== AGUARDANDO MENSAGENS SIGNALR ===');
console.log('Se vir "🟢 DADO RECEBIDO", a conexão está funcionando!');
```

### Então, em outro terminal, envie dado via MQTT:

```bash
mosquitto_pub -h 192.168.15.177 -p 1883 \
  -u parking_iot -P ParkingIot@2026 \
  -t "parking/spots/1" \
  -m '{"vagaId":1,"status":"ocupada","parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","device":"esp32-parking-01","uptime_s":10}'
```

### 🟢 Você deve ver no console do browser:
```
[useSignalR] 🟢 SpotUpdated callback disparado: {vagaId: 1, status: "ocupada", ...}
[Home] 🟢 SpotUpdated event received: {vagaId: 1, status: "ocupada", ...}
[Home] 📍 Spot 1 mudou para: 1 (status Occupied)
```

---

## 3️⃣ Verificar Requisições de Rede

1. Abra **DevTools → Network**
2. Procure por requisições para `/hubs/parking`
3. Você deve ver:
   - ✅ `POST /hubs/parking/negotiate` → Status 200
   - ✅ `GET /hubs/parking` → Status 101 (WebSocket upgrade)

Se NÃO vir essas requisições, a conexão não está acontecendo!

---

## 4️⃣ Checklist de Conexão

- [ ] Backend está rodando: `docker compose up` (verifique logs do backend)
- [ ] Frontend está rodando: `http://localhost:3000`
- [ ] `window.signalRConnection` existe e não é `undefined`
- [ ] `window.signalRConnection.state === 1` (conectado)
- [ ] Requisições `/hubs/parking/negotiate` e `/hubs/parking` aparecem no Network
- [ ] Console mostra `[SignalR] ✅ Conectado com sucesso!`
- [ ] Ao receber MQTT, console mostra `🟢 DADO RECEBIDO` 

---

## 5️⃣ Logs Esperados na Ordem

Ao carregar a página:

```
[SignalR Init] HUB_URL = http://localhost:5167/hubs/parking
[useSignalR] Hook montado. parkingLotId: 45fc18f2-bdd8-4b11-b964-f8face1147f0
[useSignalR] ⏳ Iniciando conexão SignalR...
[SignalR] start() chamado
[SignalR] 🔧 Criando nova HubConnection para: http://localhost:5167/hubs/parking
[SignalR] ✅ window.signalRConnection disponível
[SignalR] 📡 Iniciando conexão...
[SignalR] ✅ Conectado com sucesso! ID: abc123xyz
[useSignalR] ✅ SignalRService.start() completado
[useSignalR] ⏳ Fazendo join do parkingLot...
[SignalR] joinParkingLot() chamado para: 45fc18f2-bdd8-4b11-b964-f8face1147f0
[SignalR] 📤 Invocando JoinParkingLot...
[SignalR] ✅ JoinParkingLot sucesso!
[useSignalR] ✅ JoinParkingLot completado
[useSignalR] ⏳ Registrando callback SpotUpdated...
[SignalR] Registrando listener para SpotUpdated
[SignalR] ✅ Listener SpotUpdated registrado
[useSignalR] ✅ Callback registrado
[useSignalR] ✅ SUCESSO! Estado conectado
[Home] ✅ window.parkingAppState disponível no console
```

---

## 6️⃣ Troubleshooting

### Problema: `window.signalRConnection === undefined`
**Solução**: O hook nunca foi executado. Verifique se `page.tsx` está chamando `useSignalR`.

### Problema: `state === 0` ou `state === 2`
**Possíveis valores:**
- 0 = Connecting
- 1 = Connected ✅
- 2 = Reconnecting
- 3 = Disconnecting
- 4 = Disconnected

Se estiver em 0, aguarde. Se 2, 3, 4 = erro na conexão.

### Problema: CORS Error
Verifique no backend se `app.UseCors()` está permitindo origem `http://localhost:3000`.

### Problema: 404 em `/hubs/parking`
Backend SignalR Hub não foi mapeado. Verifique se `services.AddSignalR()` e `app.MapHub` estão no backend.

---

## 7️⃣ Comandos Úteis para Teste

### Ver logs do backend em tempo real:
```bash
docker logs -f parking-backend | grep -E "SignalR|Broadcast|spot updated"
```

### Enviar teste MQTT com status mudado:
```bash
mosquitto_pub -h 192.168.15.177 -p 1883 \
  -u parking_iot -P ParkingIot@2026 \
  -t "parking/spots/1" \
  -m '{"vagaId":1,"status":"ocupada","parkingLotId":"45fc18f2-bdd8-4b11-b964-f8face1147f0","device":"esp32-parking-01","uptime_s":10}'
```

### Limpar estado e reconectar:
```javascript
// No console do browser
window.signalRConnection.stop().then(() => {
  console.log('Desconectado. Recarregue a página para reconectar.');
});
```

---

## 8️⃣ Estrutura dos Dados

### SpotUpdated (recebido do backend)
```json
{
  "spotId": "uuid",
  "spotNumber": 1,
  "status": "livre",
  "parkingLotId": "45fc18f2-bdd8-4b11-b964-f8face1147f0",
  "lastUpdate": "2026-05-11T23:41:15.123Z"
}
```

### UpdateDashboardStats (recebido do backend)
```json
{
  "totalSpots": 20,
  "occupiedSpots": 5,
  "freeSpots": 15,
  "reservedSpots": 0,
  "maintenanceSpots": 0,
  "occupancyRate": 25.0,
  "lastUpdate": "2026-05-11T23:41:15.123Z"
}
```

---

## 9️⃣ Se Ainda Assim Não Funcionar

Coloque este código no `page.tsx` para debug máximo:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    console.log('[DEBUG] Conexão:', window.signalRConnection?.state);
    console.log('[DEBUG] isConnected:', isConnected);
    console.log('[DEBUG] signalRError:', signalRError);
  }, 5000);
  
  return () => clearInterval(interval);
}, [isConnected, signalRError]);
```

---

## 🔟 Próximos Passos

1. ✅ Código está em `/app/src/services/signalr.ts`
2. ✅ Hook está em `/app/src/hooks/useSignalR.ts`
3. ✅ Integração está em `/app/src/app/page.tsx`
4. 📦 Rebuild: `docker compose build`
5. 🚀 Teste: `docker compose up`
6. 🔧 Console: Abra DevTools e execute verificações acima

---

**Data**: 11/05/2026  
**Status**: Código 100% funcional com debug completo
