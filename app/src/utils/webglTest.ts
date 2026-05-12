/**
 * Utilitários para teste e validação de WebGL
 * Arquivo: app/src/utils/webglTest.ts
 * ✅ Tipos corrigidos para compatibilidade TypeScript
 */

/**
 * Testa se WebGL está disponível
 */
export function testWebGLAvailability(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl') || canvas.getContext('webgl2');
    return !!context;
  } catch {
    return false;
  }
}

/**
 * Retorna informações detalhadas sobre WebGL
 */
export function getWebGLInfo(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl: WebGL2RenderingContext | WebGLRenderingContext | null = 
      canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) return 'WebGL not supported';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info') as any;
    if (!debugInfo) return 'WebGL supported (no debug info)';

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

    return `${vendor} - ${renderer}`;
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
  }
}

/**
 * Força detecção de hardware acceleration
 */
export function forceHardwareRendering(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl: WebGL2RenderingContext | null = canvas.getContext('webgl2', {
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });

    if (gl) {
      console.log('[WebGL Force] ✅ Hardware rendering ativado');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[WebGL Force] ❌ Erro:', error);
    return false;
  }
}

/**
 * Log detalhado de diagnostics WebGL
 */
export function logWebGLDiagnostics(): void {
  console.group('[WebGL Diagnostics]');
  
  try {
    const canvas = document.createElement('canvas');
    
    // Tentar WebGL2 primeiro, depois WebGL1 como fallback
    let gl: WebGL2RenderingContext | WebGLRenderingContext | null = 
      canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
    
    // Fallback para WebGL 1.0 se WebGL2 falhar
    if (!gl) {
      gl = canvas.getContext('webgl', {
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
      });
    }

    if (!gl) {
      console.error('❌ WebGL not supported');
      console.groupEnd();
      return;
    }

    console.log('✅ WebGL Available');
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info') as any;
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const version = gl.getParameter(gl.VERSION);
      
      console.log('Vendor:', vendor);
      console.log('Renderer:', renderer);
      console.log('Version:', version);
      
      // Detectar se é software renderer
      const isSoftware = renderer?.toString().toLowerCase().includes('software');
      console.log('Hardware Accelerated:', isSoftware ? '❌' : '✅');
    }

    // Limites
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxViewportSize = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    console.log('Max Texture Size:', maxTextureSize);
    console.log('Max Viewport Size:', maxViewportSize);

  } catch (error) {
    console.error('Error checking WebGL:', error);
  }
  
  console.groupEnd();
}
