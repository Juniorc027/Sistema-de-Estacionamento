/**
 * React Hook para gerenciar conexão SignalR - COMPLETO COM DEBUG
 */
import { useEffect, useState } from 'react';
import { SpotUpdatedEvent } from '../types/parking';
import { signalRService } from '../services/signalr';

export function useSignalR(
  onSpotUpdated: (event: SpotUpdatedEvent) => void,
  parkingLotId: string,
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useSignalR] Hook montado. parkingLotId:', parkingLotId);
    
    let mounted = true;

    const connect = async () => {
      try {
        console.log('[useSignalR] ⏳ Iniciando conexão SignalR...');
        
        // Step 1: Conectar ao hub
        await signalRService.start();
        console.log('[useSignalR] ✅ SignalRService.start() completado');

        if (!mounted) {
          console.log('[useSignalR] ⚠️ Componente desmontado durante conexão');
          return;
        }

        // Step 2: Join parking lot
        console.log('[useSignalR] ⏳ Fazendo join do parkingLot...');
        await signalRService.joinParkingLot(parkingLotId);
        console.log('[useSignalR] ✅ JoinParkingLot completado');

        if (!mounted) {
          console.log('[useSignalR] ⚠️ Componente desmontado durante join');
          return;
        }

        // Step 3: Registrar callback
        console.log('[useSignalR] ⏳ Registrando callback SpotUpdated...');
        signalRService.onSpotUpdated((event: SpotUpdatedEvent) => {
          console.log('[useSignalR] 🟢 SpotUpdated callback disparado:', event);
          if (mounted) {
            onSpotUpdated(event);
          }
        });
        console.log('[useSignalR] ✅ Callback registrado');

        if (mounted) {
          setIsConnected(true);
          console.log('[useSignalR] ✅ SUCESSO! Estado conectado');
        }
      } catch (err) {
        if (mounted) {
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
          console.error('[useSignalR] ❌ ERRO DE CONEXÃO:', errorMsg);
          console.error('[useSignalR] Stack:', err);
          setError(errorMsg);
        }
      }
    };

    connect();

    // Cleanup
    return () => {
      console.log('[useSignalR] 🧹 Cleanup: desmontando...');
      mounted = false;
      signalRService.off('SpotUpdated');
      signalRService.stop().catch((err) => {
        console.error('[useSignalR] Erro ao parar SignalR:', err);
      });
      setIsConnected(false);
    };
  }, [parkingLotId, onSpotUpdated]);

  return { isConnected, error };
}

