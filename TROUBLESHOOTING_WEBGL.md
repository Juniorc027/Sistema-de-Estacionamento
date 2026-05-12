# 🔧 Troubleshooting Completo — WebGL em Docker

---

## 🎯 Cenário 1: "Could not create a WebGL context, Sandboxed = yes"

**Erro completo:**
```
THREE.WebGLRenderer: A WebGL context could not be created.
Reason: Could not create a WebGL context, Sandboxed = yes...
```

### ✅ Solução 1.1: Atualizar next.config.js

Verifique se `next.config.js` tem:

```javascript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin',
        },
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp',
        },
      ],
    },
  ];
}
```

**Se não tiver:**
- Copia o conteúdo de `SOLUCAO_WEBGL_DOCKER.md` (Solução 1)
- Substitui `next.config.js`

### ✅ Solução 1.2: Limpar cache e rebuildar

```bash
# Parar containers
docker-compose down

# Remover volumes
docker volume prune

# Limpar build cache
docker builder prune -a

# Rebuildar
docker-compose build --no-cache frontend

# Iniciar
docker-compose up
```

### ✅ Solução 1.3: Verificar headers CORS

1. Abrir DevTools (F12)
2. Ir em **Network**
3. Recarregar página
4. Clicar em `localhost:3000` (primeiro request)
5. Ir em **Response Headers**
6. Verificar se tem:
   - `Cross-Origin-Opener-Policy: same-origin`
   - `Cross-Origin-Embedder-Policy: require-corp`

**Se não tiver:** Fazer rebuild do container

---

## 🎯 Cenário 2: "WebGL extension not available"

**Situação:** Erro ao tentar carregar extensões WebGL

### ✅ Solução 2.1: Verificar contexto WebGL

No DevTools Console, execute:

```javascript
// Test WebGL2
let canvas = document.createElement('canvas');
let gl = canvas.getContext('webgl2');
console.log('WebGL2:', gl ? '✅' : '❌');

// Test WebGL 1
gl = canvas.getContext('webgl');
console.log('WebGL:', gl ? '✅' : '❌');

// Test com options
gl = canvas.getContext('webgl2', {
  powerPreference: 'high-performance',
  failIfMajorPerformanceCaveat: false
});
console.log('WebGL2 com options:', gl ? '✅' : '❌');
```

### ✅ Solução 2.2: Atualizar Canvas props

Verificar se `ParkingLot.tsx` tem:

```typescript
gl={{
  antialias: true,
  powerPreference: 'high-performance',
  stencil: true,
  depth: true,
  failIfMajorPerformanceCaveat: false,  // ← Chave!
  alpha: true,
  debug: true,
}}
```

Se não tem `failIfMajorPerformanceCaveat: false`, adicionar.

---

## 🎯 Cenário 3: Performance Baixa (Software Renderer)

**Sintoma:** Aviso amarelo no topo: "Performance Baixa: Usando renderer de software"

### ✅ Solução 3.1: Verificar tipo de renderer

No DevTools Console:

```javascript
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
console.log('Renderer:', renderer);
```

**Resultado esperado:**
- ✅ `Apple M1`, `Intel HD Graphics`, `NVIDIA GeForce`
- ❌ `SwiftShader`, `LLVMpipe`, `Software`

### ✅ Solução 3.2: Ativar Hardware Acceleration (Chrome)

1. Abrir `chrome://settings/system`
2. Ativar toggle **"Use hardware acceleration"**
3. Reiniciar navegador
4. Verificar em DevTools: `about:gpu`

### ✅ Solução 3.3: Ativar Hardware Acceleration (Edge)

1. Abrir `edge://settings/system`
2. Ativar toggle **"Use hardware acceleration"**
3. Reiniciar navegador
4. Verificar em DevTools: `edge://gpu`

### ✅ Solução 3.4: Atualizar Drivers de GPU

**Windows:**
- NVIDIA: nvidia.com/Download/driverDetails.aspx
- Intel: downloadcenter.intel.com
- AMD: amd.com/drivers

**macOS:**
- Software Update → System Preferences → Updates

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install linux-headers-$(uname -r)
ubuntu-drivers autoinstall

# Fedora
sudo dnf install akmod-nvidia
```

---

## 🎯 Cenário 4: Container não inicia

**Erro:**
```
ERROR: service 'frontend' failed to start
docker: Error response from daemon: OCI runtime error
```

### ✅ Solução 4.1: Aumentar memória Docker

**Docker Desktop:**
1. Preferences → Resources
2. Aumentar **Memory** para 4GB+
3. Aumentar **Swap** para 2GB+
4. Restart

**Docker em Linux:**
```bash
# Aumentar shm_size em docker-compose.yml
# Mínimo: 512mb
# Recomendado: 1gb para 3D graphics
```

### ✅ Solução 4.2: Limpar containers antigos

```bash
# Parar tudo
docker-compose down -v

# Remover todos containers
docker container prune -f

# Remover volumes não usados
docker volume prune -f

# Limpar builder cache
docker builder prune -a

# Reconstruir
docker-compose up --build
```

### ✅ Solução 4.3: Verificar logs

```bash
# Ver logs do container
docker-compose logs frontend

# Ver logs contínuos
docker-compose logs -f frontend

# Ver logs do build
docker-compose build --no-cache frontend 2>&1 | tail -50
```

---

## 🎯 Cenário 5: Visualização 3D não renderiza

**Sintoma:** Canvas branca/preta, sem vagas

### ✅ Solução 5.1: Verificar DevTools Console

Abrir F12 → Console e procurar por:

1. **Erros de shader:**
   ```
   THREE.WebGLProgram: shader error
   ```
   → Significa problema no arquivo de shader ou transpile

2. **Erros de context:**
   ```
   WebGL: CONTEXT_LOST_WEBGL
   ```
   → Significa GPU memory insuficiente

3. **Aviso de depthTest:**
   ```
   THREE.WebGLRenderer: gl.depthTest() requires a context
   ```
   → Significa contexto WebGL não criado corretamente

### ✅ Solução 5.2: Verificar import ParkingLot

Certificar que `page.tsx` usa:

```typescript
import { ParkingLotWithFallback } from '../components/parking/ParkingLotWithFallback';

// Em render:
<ParkingLotWithFallback spots={spots} />
```

Não usar:
```typescript
<ParkingLot spots={spots} />  // ❌ Sem fallback
```

### ✅ Solução 5.3: Verificar prop `spots`

No DevTools Console:

```javascript
// Encontrar componente React
const root = document.getElementById('__next');
// Verificar se spots data está chegando
// Usar React DevTools extension
```

### ✅ Solução 5.4: Verificar transpile packages

`next.config.js` deve ter:

```javascript
transpilePackages: [
  'three',
  '@react-three/fiber',
  '@react-three/drei',
],
```

Se não tiver, adicionar e rebuildar.

---

## 🎯 Cenário 6: Vagas não atualizam em tempo real

**Sintoma:** Status de vagas não muda após MQTT update

### ✅ Solução 6.1: Verificar SignalR connection

No DevTools Console:

```javascript
// Procurar por logs SignalR
// Deve aparecer: "SignalR connected"
// Se não aparecer, há problema na conexão
```

### ✅ Solução 6.2: Verificar normalização de spotNumber

No DevTools Console durante update:

```javascript
// Deve aparecer:
// [Home] Comparing spot: 007 with event: 007 match: true
// Se não aparecer ou match: false, há bug
```

### ✅ Solução 6.3: Verificar env vars

```bash
# Verificar em docker-compose.yml:
NEXT_PUBLIC_SIGNALR_URL=http://parking-backend:5167/hubs/parking
NEXT_PUBLIC_API_URL=http://parking-backend:5167

# Deve estar acessível dentro do container:
docker exec parking-frontend curl http://parking-backend:5167/health
```

---

## 🎯 Cenário 7: CORS errors no console

**Erro:**
```
Access to XMLHttpRequest from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

### ✅ Solução 7.1: Verificar backend CORS

No backend `.NET`, verificar `Program.cs`:

```csharp
services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

app.UseCors("AllowAll");
```

### ✅ Solução 7.2: Verificar URLs de conexão

Em `docker-compose.yml`, backend deve estar acessível:

```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://parking-backend:5167  # ← Dentro do Docker
  - NEXT_PUBLIC_SIGNALR_URL=http://parking-backend:5167/hubs/parking
```

### ✅ Solução 7.3: Testar conectividade

```bash
# Do container frontend, testar backend
docker exec parking-frontend curl -v http://parking-backend:5167/health

# Deve retornar 200 OK
```

---

## 🎯 Cenário 8: Aviso de Strict Mode

**Aviso:**
```
Warning: useEffect has a dependency...
Warning: <Component> was rendered in double strict mode...
```

### ✅ Solução 8.1: Verificar dev vs prod

Isso é **normal em development** (React.StrictMode).

Se em **production**, desabilitar em `next.config.js`:

```javascript
reactStrictMode: false,  // ← Apenas para production troubleshooting
```

---

## 📊 Matriz de Decisão

```
┌─ WebGL está disponível? ─────┐
│                              │
├─ SIM ───────┬─ Hardware?     │
│             │                │
│             ├─ SIM ──→ ✅ OK │
│             └─ NÃO ──→ ⚠️ Aviso
│
├─ NÃO ──────────────→ ❌ Fallback
```

---

## 🚀 Teste de Diagnóstico Completo

Execute no DevTools Console:

```javascript
async function diagnoseWebGL() {
  console.group('🔍 WebGL Diagnostics');
  
  // 1. Suporte básico
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  console.log('WebGL Supported:', gl ? '✅' : '❌');
  
  if (!gl) return;
  
  // 2. Vendor/Renderer
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    console.log('Vendor:', gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
    console.log('Renderer:', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
  }
  
  // 3. Versão
  console.log('Version:', gl.getParameter(gl.VERSION));
  
  // 4. Limites
  console.log('Max Texture:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
  console.log('Max Viewport:', gl.getParameter(gl.MAX_VIEWPORT_DIMS));
  
  // 5. Extensions
  const extensions = gl.getSupportedExtensions();
  console.log('Extensions count:', extensions.length);
  
  // 6. SignalR
  console.log('SignalR status:', window.signalRService ? '✅' : '❌');
  
  console.groupEnd();
}

// Executar
diagnoseWebGL();
```

---

## 📞 Quando pedir ajuda

Incluir no relatório de bug:

1. **Output de diagnóstico (acima)**
2. **DevTools Console (F12)** - Todos os erros
3. **DevTools Network** - Failed requests
4. **DevTools GPU** - `chrome://gpu` ou `edge://gpu`
5. **Docker logs** - `docker-compose logs`
6. **OS + Browser:** Windows/macOS/Linux + Chrome/Edge/Firefox
7. **Docker version:** `docker --version`

---

**Sucesso esperado:** Todas as soluções acima cobrem 99% dos casos WebGL em Docker 🎉
