/**
 * React Hook para gerenciar conexão SignalR
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
    let mounted = true;

    const connect = async () => {
      try {
        await signalRService.start();
        await signalRService.joinParkingLot(parkingLotId);
        if (mounted) {
          setIsConnected(true);
          signalRService.onSpotUpdated(onSpotUpdated);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to connect');
          console.error('[SignalR] Connection error:', err);
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      signalRService.off('SpotUpdated');
      signalRService.stop().catch(() => undefined);
      setIsConnected(false);
    };
  }, [onSpotUpdated, parkingLotId]);

  return { isConnected, error };
}

