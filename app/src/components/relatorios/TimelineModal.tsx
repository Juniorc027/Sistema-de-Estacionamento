'use client';

import { useEffect, useState } from 'react';
import { BaseModal } from './BaseModal';
import { ExportButtons } from './ExportButtons';
import { ApiService } from '@/services/api';
import { HourlyOccupancyDto } from '@/types/parking';

const LOT_ID = process.env.NEXT_PUBLIC_PARKING_LOT_ID || '45fc18f2-bdd8-4b11-b964-f8face1147f0';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TimelineModal({ open, onClose }: Props) {
  const [data, setData] = useState<HourlyOccupancyDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(() => new Date().toISOString().split('T')[0]);
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    ApiService.getReportHourlyOccupancy(LOT_ID, from, to)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, from, to]);

  const maxOccupancy = data.length > 0 ? Math.max(...data.map((d) => Number(d.averageOccupancy))) : 100;

  return (
    <BaseModal open={open} title="Data e Hora de Ocupação" subtitle="Distribuição da ocupação por hora do dia" onClose={onClose}>
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Data Inicial</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Data Final</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <ExportButtons reportType="hourly" from={from} to={to} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-zinc-400">Carregando...</div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-zinc-500">Nenhum dado encontrado.</div>
      ) : (
        <div className="space-y-2">
          {data.map((item) => {
            const hour = new Date(item.hour).getHours();
            const pct = maxOccupancy > 0 ? (Number(item.averageOccupancy) / maxOccupancy) * 100 : 0;
            const barColor = Number(item.averageOccupancy) > 80 ? 'bg-red-500' : Number(item.averageOccupancy) > 50 ? 'bg-amber-500' : 'bg-blue-500';

            return (
              <div key={hour} className="flex items-center gap-3">
                <span className="text-zinc-400 text-xs w-12 flex-shrink-0 text-right">{String(hour).padStart(2, '0')}:00</span>
                <div className="flex-1 h-6 bg-zinc-800 rounded overflow-hidden">
                  <div
                    className={`h-full ${barColor} rounded transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-zinc-300 text-xs w-12 flex-shrink-0">{Number(item.averageOccupancy).toFixed(0)}%</span>
                <span className="text-zinc-500 text-xs w-16 flex-shrink-0">{item.peakOccupiedCount}/{item.totalSpots} vagas</span>
              </div>
            );
          })}
        </div>
      )}
    </BaseModal>
  );
}
