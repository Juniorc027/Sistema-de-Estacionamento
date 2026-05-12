/**
 * Componente ParkingLot com fallback para quando WebGL não está disponível
 * Arquivo: app/src/components/parking/ParkingLotWithFallback.tsx
 */

'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useWebGLSupport } from '../../hooks/useWebGLSupport';
import { ParkingSpot } from '../../types/parking';

const ParkingLot = dynamic(
  () => import('./ParkingLot').then((mod) => mod.ParkingLot),
  { 
    ssr: false,
    loading: () => <LoadingSpinner />,
  }
);

function LoadingSpinner() {
  return (
    <div className="w-full h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
        </div>
        <p className="text-white text-xl mb-2">Carregando visualização 3D...</p>
        <p className="text-gray-400 text-sm">Inicializando WebGL</p>
      </div>
    </div>
  );
}

function WebGLNotSupportedFallback() {
  return (
    <div className="w-full h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md bg-red-900 border-2 border-red-600 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-4">WebGL Não Disponível</h2>
        <p className="text-gray-200 mb-6">
          Seu navegador ou ambiente não suporta WebGL, necessário para a visualização 3D.
        </p>
        
        <div className="bg-gray-800 p-4 rounded mb-6 text-left">
          <p className="text-gray-300 text-sm font-mono">
            WebGL Status: <span className="text-red-400">✗ Desativado</span>
          </p>
        </div>

        <div className="text-left space-y-3 mb-6">
          <h3 className="text-white font-bold text-sm">Soluções:</h3>
          <ul className="text-gray-300 text-sm space-y-2">
            <li>✓ Ativar Hardware Acceleration (Chrome/Edge)</li>
            <li>✓ Atualizar drivers de GPU</li>
            <li>✓ Usar navegador diferente (Chrome, Edge, Firefox)</li>
            <li>✓ Reiniciar o navegador</li>
          </ul>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition"
        >
          🔄 Tentar Novamente
        </button>
      </div>
    </div>
  );
}

function SoftwareRendererWarning() {
  return (
    <div className="absolute top-4 left-4 bg-yellow-900 border-2 border-yellow-600 rounded p-4 z-20 max-w-sm">
      <p className="text-yellow-100 text-sm">
        ⚠️ <strong>Performance Baixa:</strong> Usando renderer de software. 
        Ative hardware acceleration para melhor desempenho.
      </p>
    </div>
  );
}

interface ParkingLotWithFallbackProps {
  spots: ParkingSpot[];
}

export function ParkingLotWithFallback({ spots }: ParkingLotWithFallbackProps) {
  const webglInfo = useWebGLSupport();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <LoadingSpinner />;
  }

  if (!webglInfo.isSupported) {
    return <WebGLNotSupportedFallback />;
  }

  return (
    <div className="relative w-full h-screen">
      {!webglInfo.isHardwareAccelerated && <SoftwareRendererWarning />}
      
      <ParkingLot spots={spots} />
      
      {/* Debug info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 bg-gray-800/90 p-3 rounded text-xs text-gray-300 font-mono max-w-xs z-10">
          <div>WebGL: {webglInfo.isSupported ? '✅' : '❌'}</div>
          <div>Vendor: {webglInfo.vendor}</div>
          <div>Renderer: {webglInfo.renderer}</div>
          <div>Hardware: {webglInfo.isHardwareAccelerated ? '✅' : '⚠️'}</div>
        </div>
      )}
    </div>
  );
}
