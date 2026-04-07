# 🧪 Testing Guide — Testar Localmente Antes do Backend

## ⚡ Quick Start

```bash
# 1. Ir para o diretório da app
cd app

# 2. Iniciar servidor dev
npm run dev

# 3. Abrir no browser
open http://localhost:3000 # macOS
# ou
xdg-open http://localhost:3000 # Linux
# ou
start http://localhost:3000 # Windows
```

---

## 📋 Testes Frontend (Sem Backend)

> ❓ **Problema**: Backend não tem os 3 novos endpoints ainda. Como tester então?

> ✅ **Solução**: Instruções abaixo para simular as APIs com Mock Server ou Postman.

---

## 🧩 Opção 1: Mock Server Local (Recomendado)

### Setup Rápido com `json-server`

#### Passo 1: Instalar json-server
```bash
npm install -g json-server
```

#### Passo 2: Criar arquivo `db.json` no root do projeto
```json
{
  "kpi": {
    "overview": {
      "success": true,
      "data": {
        "parkingLotId": "123e4567-e89b-12d3-a456-426614174000",
        "parkingLotName": "Estacionamento Central",
        "occupancy": {
          "occupancyPercentage": 75.5,
          "occupiedCount": 15,
          "totalSpots": 22,
          "trend": 2.3
        },
        "entries": {
          "totalEntriesCount": 45,
          "trend": 5.1,
          "averageEntriesPerHour": 6,
          "peakHour": "14:00"
        },
        "peakHour": {
          "hourFrom": "14:00",
          "hourTo": "15:30",
          "occupancyPercentage": 92.0,
          "entriesCount": 18
        },
        "lastUpdated": "2026-04-07T15:30:00Z"
      },
      "statusCode": 200,
      "message": "KPI overview retrieved successfully"
    },
    "ranking": [
      {
        "rank": 1,
        "spotNumber": "001",
        "spotId": "abc123-001",
        "useCount": 1200,
        "maxUseCount": 1200,
        "averageDurationMinutes": 45.5,
        "occupancyRate": 92.0,
        "status": "Ocupada",
        "frequencyBadge": "🔥"
      },
      {
        "rank": 2,
        "spotNumber": "002",
        "spotId": "abc123-002",
        "useCount": 1180,
        "maxUseCount": 1200,
        "averageDurationMinutes": 42.3,
        "occupancyRate": 88.5,
        "status": "Livre",
        "frequencyBadge": "⭐"
      }
    ]
  }
}
```

#### Passo 3: Iniciar json-server em outro terminal
```bash
json-server --watch db.json --port 3001
```

#### Passo 4: Atualizar `.env.local` do frontend
```bash
# File: app/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### Passo 5: Restart frontend
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: json-server
json-server --watch db.json --port 3001
```

---

## 🎯 Testes Manual (Checklist)

### ✅ Teste 1: Dashboard Carrega com Dados Reais

1. Abrir http://localhost:3000
2. Na direita, deve aparecer Dashboard
3. **Verificar** (durante ~1-2s):
   - Skeleton screens pulsando (boxes vazias animadas)
4. **Após load**:
   - [x] 3 KPI Cards visíveis
     - Ocupação Atual: 75% (com donut chart)
     - Entradas Hoje: 45 (com trend +5.1%)
     - Horário de Maior Uso: 14:00-15:30
   - [x] Ranking abaixo com 2 vagas listadas
   - [x] Cada vaga tem: rank, número, badge (🔥⭐), status, % uso

### ✅ Teste 2: Filtro de Período Funciona

1. No topo do Dashboard, clicar em "Hoje" (dropdown)
2. Selecionar "Ontem"
3. **Verificar**:
   - Skeleton screens aparecem novamente
   - Dados atualizam (e.g., Entradas pode ser diferente)
4. Testar outros períodos: "Última Semana", "Último Mês"

### ✅ Teste 3: Sidebar Simplificado

1. Passar mouse sobre Sidebar (esquerda)
2. **Verificar**:
   - Apenas 2 itens: "Dashboard" (verde no topo) + "Relatórios Detalhados"
   - Dashboard item é maior (h-12) que relatórios (h-11)
   - Divider visual entre eles
3. Clicar em Dashboard:
   - Dashboard painel abre
4. Clicar em Relatórios Detalhados:
   - ReportPanel abre (direita)
   - Vê 4 tabs: Histórico | Ocupação | Duração | Ranking

### ✅ Teste 4: ReportPanel Com Tabs

1. Clicar em "Relatórios Detalhados"
2. **Verificar**:
   - Header diz "Relatórios Detalhados" (não mais "Histórico Completo")
   - 4 tabs visíveis abaixo do header
   - Botão "Exportar" (azul) + botão "Fechar"
3. Clicar em cada tab:
   - "Ocupação" → Gráfico de ocupação por hora
   - "Duração" → Estatísticas de tempo médio
   - "Ranking" → Top 10 vagas
4. **Verificar**:
   - Tabs trocam SEM reabrir painel
   - Dados diferentes por tab

### ✅ Teste 5: Exportação CSV

1. Dentro do ReportPanel, clicar em "Exportar"
2. **Verificar**:
   - Arquivo `relatorio-history-YYYY-MM-DD.csv` baixa
   - Browser show download notification
3. Abrir CSV em Excel/Google Sheets
   - Ver dados em formato tabulado
   - Colunas: spotNumber, licensePlate, entryTime, exitTime, duration, amount

### ✅ Teste 6: Navegação Fluida

1. Clicar: Dashboard → Relatórios → Ocupação Tab → Duração Tab → Dashboard
2. **Verificar**:
   - Transições suaves (Framer Motion)
   - Sem flicker ou blink
   - Sem "tela branca"
   - Sempre responsivo

### ✅ Teste 7: Console Sem Erros

1. Abrir Developer Tools (F12)
2. Clicar em "Console"
3. **Verificar**:
   - Nenhuma mensagem em vermelho (errors)
   - Nenhuma mensagem amarela (warnings não esperadas)
4. Network Tab:
   - Requests a `http://localhost:3001/kpi/overview` retornam 200
   - Requests a `http://localhost:3001/kpi/ranking` retornam 200

---

## 🧌 Opção 2: Usar Postman para Simular API

> Alternativa se preferir não usar json-server

### Passo 1: Criar Mock Service no Postman

1. Abrir Postman
2. Criar Collection: "Parking KPI API"
3. Adicionar 3 requisições:

**Request 1: GET /kpi/overview**
```
URL: http://localhost:3000/api/kpi/overview?parkingLotId=123e4567-e89b-12d3-a456-426614174000&timePeriod=today

Response (mock):
{
  "success": true,
  "data": {
    "parkingLotId": "123e4567-e89b-12d3-a456-426614174000",
    "parkingLotName": "Estacionamento Central",
    "occupancy": {
      "occupancyPercentage": 75.5,
      "occupiedCount": 15,
      "totalSpots": 22,
      "trend": 2.3
    },
    "entries": {
      "totalEntriesCount": 45,
      "trend": 5.1,
      "averageEntriesPerHour": 6,
      "peakHour": "14:00"
    },
    "peakHour": {
      "hourFrom": "14:00",
      "hourTo": "15:30",
      "occupancyPercentage": 92.0,
      "entriesCount": 18
    },
    "lastUpdated": "2026-04-07T15:30:00Z"
  },
  "statusCode": 200
}
```

### Passo 2: Usar Postman Mock Server

1. Em Postman, ir em **Settings** → **Mock Servers**
2. Clique **Create Mock Server**
3. Selecionar Collection "Parking KPI API"
4. Copiar URL do Mock Server
5. Atualizar `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=https://mock-server-url-aqui.postman.mock
   ```

---

## 🐛 Troubleshooting Testes

| Problema | Solução |
|----------|---------|
| Dashboard carrega mas mostra "Failed to fetch" | Verificar `.env.local` — API_URL correto? |
| json-server retorna erro CORS | Backend não retornando headers CORS |
| Skeleton screens não animam | Framer Motion importado? Ver console |
| CSV não baixa | Content-Type não é "text/csv" |
| Sidebar ainda mostra 4 itens | Cache do browser — Ctrl+Shift+Delete |

---

## 📸 Screenshots Esperados

### Dashboard com Dados Reais
```
┌────────────────────────────────────┐
│ Dashboard                          │ Insights em Tempo Real
│ [Hoje ▼]                          │
├────────────────────────────────────┤
│ ┌─ Ocupação Atual   ┐              │
│ │ 75% (animated     │              │
│ │ 15/22 vagas      │              │
│ │ +2.3% ↑          │              │
│ └────────────────────┘              │
│                                    │
│ ┌─ Entradas Hoje    ┐              │
│ │ 45 (big font)     │              │
│ │ Média: 6/h        │              │
│ │ +5.1% ↑           │              │
│ └────────────────────┘              │
│                                    │
│ ┌─ Horário de Pico  ┐              │
│ │ 14:00 - 15:30     │              │
│ │ Ocupação: 92%     │              │
│ └────────────────────┘              │
│                                    │
│ ─── DIVIDER ───                    │
│                                    │
│ Ranking de Vagas                   │
│ [🔥 Rank 1 | Vaga 001 | 92%]       │
│ [⭐ Rank 2 | Vaga 002 | 88.5%]     │
│                                    │
│ Atualizado em: 15:30:45            │
└────────────────────────────────────┘
```

### Sidebar Refatorado
```
┌───────────┐
│ 🏠 Logo   │
├───────────┤
│           │
│ Dashboard │ (green, h-12)
│           │
├─────────────┤ (divider)
│             │
│ 📊 Reports  │ (normal, h-11)
│             │
│ ┌─────────┐ │
│ │📋 Histórico│ (info box)
│ └─────────┘ │
│             │
└───────────┘
```

---

## ✅ Checklist de Testes Completo

- [ ] Dashboard aparece com skeleton screens
- [ ] Skeleton screens sumem após ~1s (dados carregados)
- [ ] KPI Cards mostram dados corretos
- [ ] Ranking mostra badges (🔥⭐🧊)
- [ ] Filtro de período funciona (recarrega dados)
- [ ] Sidebar tem apenas 2 itens
- [ ] Clique Dashboard → Dashboard painel abre
- [ ] Clique Relatórios → ReportPanel abre com 4 tabs
- [ ] Tabs trocam sem recarregar painel inteiro
- [ ] Botão Exportar → Download CSV automático
- [ ] Botão Fechar → Volta ao Dashboard
- [ ] Console sem erros (F12 → Console)
- [ ] Network requests retornam 200 (F12 → Network)
- [ ] Sem flicker ou layout shifts
- [ ] Transições suaves (Framer Motion)

---

## 🚀 Próximo Passo

Se todos os testes PASSAREM:

1. ✅ Deletar `.env.local` (volta aos defaults)
2. ✅ Implementar 3 endpoints backend conforme `BACKEND_IMPLEMENTATION.md`
3. ✅ Atualizar `.env.local` com URL do backend real
4. ✅ Rodar testes novamente com API real

---

## 📞 Debug

Se tiver problema, ver logs:

```bash
# Terminal 1: Frontend
npm run dev
# Watch para erros de compilação

# Terminal 2: Browser Console
F12 → Console → Ver mensagens reais

# Terminal 3: Network
F12 → Network → Ver requisições e responses
```

Copiar erro e verificar em `docs/TROUBLESHOOTING.md` (se existir)

