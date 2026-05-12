/**
 * Hook para detectar suporte a WebGL e informações de renderer
 * Arquivo: app/src/hooks/useWebGLSupport.ts
 * ✅ Tipos corrigidos para compatibilidade TypeScript
 */

import { useState, useEffect } from 'react';

interface WebGLInfo {
  isSupported: boolean;
  vendor?: string;
  renderer?: string;
  errorMessage?: string;
  isHardwareAccelerated: boolean;
}

export function useWebGLSupport(): WebGLInfo {
  const [webglInfo, setWebglInfo] = useState<WebGLInfo>({
    isSupported: false,
    isHardwareAccelerated: false,
  });

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      
      // Tentar WebGL2 primeiro
      let gl: WebGL2RenderingContext | WebGLRenderingContext | null = canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        antialias: true,
        stencil: true,
        depth: true,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false, // ✅ Importante para Docker
      });

      // Se WebGL2 falhar, tentar WebGL 1.0
      if (!gl) {
        gl = canvas.getContext('webgl', {
          powerPreference: 'high-performance',
          antialias: true,
          stencil: true,
          depth: true,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
        });
      }

      if (gl) {
        // Obter extensão de debug info com type-safe casting
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info') as any;
        
        let vendor = 'Unknown';
        let renderer = 'Unknown';
        
        if (debugInfo) {
          const vendorParam = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const rendererParam = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          
          vendor = vendorParam ? String(vendorParam) : 'Unknown';
          renderer = rendererParam ? String(rendererParam) : 'Unknown';
        }

        // Verificar se é software renderer (sinal de falta de hardware acceleration)
        const isSoftwareRenderer =
          renderer.toLowerCase().includes('software') ||
          renderer.toLowerCase().includes('swiftshader') ||
          renderer.toLowerCase().includes('llvmpipe') ||
          renderer.toLowerCase().includes('angle') ||
          renderer.toLowerCase().includes('mesa');

        setWebglInfo({
          isSupported: true,
          vendor,
          renderer,
          isHardwareAccelerated: !isSoftwareRenderer,
        });

        console.log('[WebGL] ✅ Suporte detectado:', {
          vendor,
          renderer,
          hardwareAccelerated: !isSoftwareRenderer,
        });
      } else {
        setWebglInfo({
          isSupported: false,
          errorMessage: 'WebGL não suportado neste navegador',
          isHardwareAccelerated: false,
        });
        console.warn('[WebGL] ❌ WebGL não disponível');
      }
    } catch (error) {
      setWebglInfo({
        isSupported: false,
        errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        isHardwareAccelerated: false,
      });
      console.error('[WebGL] ❌ Erro ao detectar WebGL:', error);
    }
  }, []);

  return webglInfo;
}
