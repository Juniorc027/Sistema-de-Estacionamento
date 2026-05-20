/**
 * React Hook para gerenciar conexão SignalR
 * 
 * IMPORTANTE: O callback 'onSpotUpdated' DEVE ser memoizado com useCallback
 * para evitar reconexões desnecessárias.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { SpotUpdatedEvent } from '../types/parking';
import { signalRService } from '../services/signalr';

export function useSignalR(
  onSpotUpdated: (event: SpotUpdatedEvent) => void,
  parkingLotId: string,
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref para rastrear se o hook está montado e para memoizar a última função
  const mountedRef = useRef(true);
  const handlerRef = useRef(onSpotUpdated);

  // Sincronizar a ref do handler com o prop mais recente
  // Isso evita reconexões desnecessárias mesmo se onSpotUpdated mudar
  useEffect(() => {
    handlerRef.current = onSpotUpdated;
  }, [onSpotUpdated]);

  useEffect(() => {
    mountedRef.current = true;

    const connect = async () => {
      try {
        // Log de debug
        console.log('[SignalR] Iniciando conexão com parkingLotId:', parkingLotId);
        
        await signalRService.start();
        await signalRService.joinParkingLot(parkingLotId);
        
        if (mountedRef.current) {
          setIsConnected(true);
          console.log('[SignalR] ✅ Conectado e inscrito em:', parkingLotId);
          
          // Registrar handler que usa a ref (sempre a função mais recente)
          signalRService.onSpotUpdated((event) => {
            if (mountedRef.current) {
              handlerRef.current(event);
            }
          });
        }
      } catch (err) {
        if (mountedRef.current) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to connect';
          setError(errorMsg);
          console.error('[SignalR] ❌ Erro de conexão:', err);
        }
      }
    };

    connect();

    return () => {
      mountedRef.current = false;
      signalRService.off('SpotUpdated');
      signalRService.stop().catch((err) => {
        console.warn('[SignalR] Erro ao desconectar:', err);
      });
      setIsConnected(false);
    };
  }, [parkingLotId]); // Só reconectar se parkingLotId mudar

  return { isConnected, error };
}

