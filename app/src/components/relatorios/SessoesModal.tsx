'use client';

import { useEffect, useState } from 'react';
import { BaseModal } from './BaseModal';
import { ExportButtons } from './ExportButtons';
import { ApiService } from '@/services/api';
import { AverageDurationReportDto } from '@/types/parking';

const LOT_ID = process.env.NEXT_PUBLIC_PARKING_LOT_ID || '45fc18f2-bdd8-4b11-b964-f8face1147f0';

interface Props { open: boolean; onClose: () => void; }

function formatDuration(ts: string | undefined): string {
  if (!ts) return '0 min';
  const match = ts.match(/(\d+):(\d+):(\d+)/);
  if (!match) return ts;
  const h = parseInt(match[1]);
  const m = parseInt(match[2]);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export function SessoesModal({ open, onClose }: Props) {
  const [data, setData] = useState<AverageDurationReportDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    ApiService.getReportAverageDuration(LOT_ID, from, to)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, from, to]);

  return (
    <BaseModal open={open} title="Sessões Detalhadas" subtitle="Estatísticas de duração e volume de permanência" onClose={onClose}>
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Data Inicial</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Data Final</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm" />
        </div>
        <ExportButtons reportType="sessions" from={from} to={to} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-zinc-400">Carregando...</div>
      ) : !data || data.totalSessions === 0 ? (
        <div className="flex items-center justify-center h-40 text-zinc-500">Nenhuma sessão encontrada no período.</div>
      ) : (
        <>
          {/* KPIs de Duração */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-1">Duração Média</p>
              <p className="text-xl font-bold text-rose-400">{formatDuration(data.averageDuration as unknown as string)}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-1">Menor Duração</p>
              <p className="text-xl font-bold text-emerald-400">{formatDuration(data.minimumDuration as unknown as string)}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-1">Maior Duração</p>
              <p className="text-xl font-bold text-amber-400">{formatDuration(data.maximumDuration as unknown as string)}</p>
            </div>
          </div>

          {/* Volume por Período */}
          <h4 className="text-sm font-semibold text-zinc-300 mb-3">Volume por Período</h4>
          <div className="space-y-3">
            {[
              { label: 'Hoje', value: data.sessionsToday },
              { label: 'Esta Semana', value: data.sessionsThisWeek },
              { label: 'Este Mês', value: data.sessionsThisMonth },
              { label: 'Total (período selecionado)', value: data.totalSessions },
            ].map(({ label, value }) => {
              const pct = data.totalSessions > 0 ? (value / data.totalSessions) * 100 : 0;
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-zinc-400 text-xs w-40 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-4 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500/70 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <span className="text-white text-sm font-medium w-12 text-right">{value}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </BaseModal>
  );
}
