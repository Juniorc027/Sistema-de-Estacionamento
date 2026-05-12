# 🔍 Guia de Debug: Frontend SignalR Não Recebe Eventos

## Status Atual
- ✅ **Backend**: Recebendo MQTT e disparando broadcasts
- ✅ **MQTT**: ESP32 conectada e publicando dados  
- ⚠️ **Frontend**: Eventos não aparecem na UI em tempo real

---

## 1️⃣ Verificar Conexão SignalR no Browser

### Passo 1: Abrir DevTools
```bash
F12 ou Ctrl+Shift+I
```

### Passo 2: Ir para Console
Colar e executar:
```javascript
// Verificar se há cliente SignalR
console.log(window.signalRConnection);

// Se existe, verificar status
if (window.signalRConnection) {
    console.log('Connection state:', window.signalRConnection.state);
    console.log('Connection ID:', window.signalRConnection.connectionId);
}
```

**Esperado:**
```
Connection state: 1  (✅ 1 = Connected)
Connection ID: "abc123xyz..."  (✅ tem um ID)
```

❌ Se mostrar `undefined`, o frontend NÃO criou conexão SignalR

---

## 2️⃣ Verificar Listeners Registrados

Execute no Console:
```javascript
// Ver se há listeners para SpotUpdated
if (window.signalRConnection) {
    // Lista de métodos registrados (não é API pública, mas funciona)
    console.log('Handlers registrados:');
    
    // Tentar chamar listener manualmente para testar
    window.signalRConnection.invoke('SpotUpdated', {
        parkingLotId: '45fc18f2-bdd8-4b11-b964-f8face1147f0',
        spotId: 1,
        spotNumber: 1,
        status: 'occupied',
        timestamp: new Date()
    }).catch(e => console.log('Erro ao invocar:', e));
}
```

---

## 3️⃣ Monitorar Eventos em Tempo Real

Cole isso no Console e deixe rodando:
```javascript
// Interceptar método on() para ver quando listeners são registrados
const originalOn = window.signalRConnection?.on;
if (originalOn) {
    window.signalRConnection.on = function(methodName, callback) {
        console.log(`✅ [SignalR] Listener registrado: "${methodName}"`);
        return originalOn.call(this, methodName, callback);
    };
    
    console.log('🔧 Monitoramento ativado. Procure por "✅ [SignalR]" nos logs');
}

// Monitorar quando mensagens chegam
window.signalRConnection?.on('SpotUpdated', (data) => {
    console.log('🎯 [SpotUpdated] Recebido:', data);
});

window.signalRConnection?.on('UpdateDashboardStats', (data) => {
    console.log('📊 [UpdateDashboardStats] Recebido:', data);
});

window.signalRConnection?.on('GateEvent', (data) => {
    console.log('🚪 [GateEvent] Recebido:', data);
});
```

**Esperado quando ESP32 mudar sensor:**
```
🎯 [SpotUpdated] Recebido: {
  parkingLotId: "45fc18f2-...",
  spotId: 1,
  status: "occupied",
  timestamp: "2026-05-11T..."
}
```

---

## 4️⃣ Verificar Requisição HTTP de Conexão

### Network Tab:
1. Abrir **DevTools → Network**
2. Recarregar página (F5)
3. Procurar por **`/hubs/parking/negotiate`**

**Esperado:**
- Status: ✅ **200 OK**
- Response contém:
  ```json
  {
    "connectionId": "...",
    "availableTransports": [
      {"transport": "WebSockets", ...},
      {"transport": "ServerSentEvents", ...}
    ]
  }
  ```

❌ Se mostrar **error**, SignalR NÃO consegue conectar ao backend

---

## 5️⃣ Testar Manualmente MQTT → SignalR

Execute no terminal:
```bash
# Publicar mensagem de teste
mosquitto_pub -h 192.168.15.177 -p 1884 \
  -u parking_iot -P ParkingIot@2026 \
  -t parking/spots \
  -m '{"spots":[{"id":1,"occupied":true}]}'

# Aguardar 2 segundos
sleep 2

# Verificar logs do backend
docker logs parking-backend | tail -20 | grep -i "broadcast\|updated"
```

**Se backend mostra**:
```
[MqttHandler] Spot updated and broadcasted: ...
```

Mas frontend NÃO mostra evento → **Problema é no Frontend**

---

## 6️⃣ Problemas Comuns & Soluções

### ❌ Problema: Connection state = 0 (Disconnected)

**Causas:**
1. CORS bloqueado
2. Backend não está em http://localhost:5167
3. Frontend URL errada em appsettings

**Solução:**
```javascript
// No console, verificar URL
console.log('Backend URL:', window.BACKEND_URL || 'não definida');
```

---

### ❌ Problema: Connection state = 2 (Connecting)

**Causa:** SignalR tentando conectar, mas demora muito ou falha

**Solução:**
```javascript
// Aguardar conexão
window.signalRConnection?.onreconnected(async () => {
    console.log('✅ Reconectado ao backend!');
});

window.signalRConnection?.onreconnecting(() => {
    console.log('⏳ Tentando reconectar...');
});
```

---

### ❌ Problema: Listener não é chamado

**Causa mais comum:** Componente React não está escutando

**Verificar:** O arquivo [app/src/hooks/useParking.ts](../../app/src/hooks/useParking.ts) ou component que usa SignalR

```typescript
// CORRETO:
useEffect(() => {
    connection?.on('SpotUpdated', (data) => {
        console.log('Vaga atualizada:', data);
        setSpots(prev => /* atualizar estado */);
    });
}, [connection]);

// ❌ ERRADO: listener dentro de render cause loop
connection.on('SpotUpdated', ...);  // vai ser registrado múltiplas vezes
```

---

## 7️⃣ Fluxo Completo de Debug

```
1. Abrir DevTools (F12)
2. Executar no Console:
   - Verificar window.signalRConnection.state === 1
   - Publicar mensagem MQTT
   - Ver se evento chega em SpotUpdated listener

3. Se evento chega, problema é React:
   - Verificar useState / setSpots
   - Verificar re-render (adicionar console.log em render)
   
4. Se evento NÃO chega:
   - Verificar logs do backend
   - Verificar Network tab para /hubs/parking/negotiate
   - Verificar CORS headers
```

---

## 8️⃣ Teste Rápido: Validar Stack Completo

Execute no terminal host (NÃO no Docker):
```bash
#!/bin/bash

echo "🔍 [1/3] Verificando Backend MQTT..."
docker logs parking-backend | grep -c "MQTT subscribed" && echo "✅ OK" || echo "❌ FALHA"

echo "🔍 [2/3] Verificando Frontend URL..."
curl -s http://localhost:3000 | grep -q "signalR\|SignalR" && echo "✅ Frontend rodando" || echo "❌ Frontend erro"

echo "🔍 [3/3] Verificando Backend HTTP..."
curl -s http://localhost:5167/health | grep -q "Healthy" && echo "✅ Backend saudável" || echo "❌ Backend erro"
```

---

## 📋 Checklist Final

- [ ] Browser Console mostra `Connection state: 1`
- [ ] Network Tab mostra `/hubs/parking/negotiate` com status 200
- [ ] Executar mosquitto_pub manualmente e ver listeners dispararem
- [ ] Backend logs mostram "Broadcast sent"
- [ ] Component React atualiza estado quando listener é chamado
- [ ] UI renderiza mudanças em tempo real

---

## 🆘 Se Nada Funcionar

1. **Reiniciar tudo:**
```bash
docker compose down
docker compose up -d
```

2. **Recarregar página no browser:**
```bash
Ctrl+Shift+R  # Hard refresh (limpa cache)
```

3. **Ver logs completos:**
```bash
docker logs parking-backend -f
# Deixar rodando em outro terminal enquanto testa no browser
```

4. **Verificar firewall:**
```bash
# Se está no mesmo PC
netstat -tulpn | grep 5167  # Backend
netstat -tulpn | grep 3000  # Frontend
```

---

**Próximo passo**: Após confirmar que eventos chegam, compartilhe os logs do console no frontend para debug.
