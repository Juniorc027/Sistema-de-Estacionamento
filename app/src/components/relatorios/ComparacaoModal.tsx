'use client';

import { useEffect, useState } from 'react';
import { BaseModal } from './BaseModal';
import { ExportButtons } from './ExportButtons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5167';
const LOT_ID = process.env.NEXT_PUBLIC_PARKING_LOT_ID || '45fc18f2-bdd8-4b11-b964-f8face1147f0';

interface SpotItem { spotNumber: string; useCount: number; averageDurationMinutes: number; occupancyRate: number; currentStatus: string; competitivenessLabel: string; }
interface ComparisonData { averageUseCount: number; standardDeviation: number; topSpots: SpotItem[]; bottomSpots: SpotItem[]; allSpots: SpotItem[]; }

interface Props { open: boolean; onClose: () => void; }

const labelColors: Record<string, string> = {
  'Alta Disputa': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Disputa Média': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Baixa Disputa': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

export function ComparacaoModal({ open, onClose }: Props) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'top' | 'bottom' | 'all'>('top');
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`${API_URL}/api/reports/spot-comparison?parkingLotId=${LOT_ID}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, from, to]);

  const tableData = tab === 'top' ? data?.topSpots : tab === 'bottom' ? data?.bottomSpots : data?.allSpots;
  const maxUse = data?.allSpots ? Math.max(...data.allSpots.map((s) => s.useCount), 1) : 1;

  return (
    <BaseModal open={open} title="Vagas Mais Disputadas" subtitle="Comparativo de utilização entre todas as vagas" onClose={onClose}>
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
        <ExportButtons reportType="comparison" from={from} to={to} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-zinc-400">Carregando...</div>
      ) : !data ? (
        <div className="flex items-center justify-center h-40 text-zinc-500">Nenhum dado encontrado.</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-1">Média de Usos</p>
              <p className="text-2xl font-bold text-violet-400">{data.averageUseCount.toFixed(1)}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-1">Desvio Padrão</p>
              <p className="text-2xl font-bold text-white">{data.standardDeviation.toFixed(1)}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {[['top', 'Top 5'], ['bottom', 'Bottom 5'], ['all', 'Todas']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key as typeof tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-violet-600/30 text-violet-400 border border-violet-500/40' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {tableData?.map((s, idx) => {
              const barWidth = (s.useCount / maxUse) * 100;
              const labelCls = labelColors[s.competitivenessLabel] ?? 'text-zinc-400 bg-zinc-700/20 border-zinc-700/20';
              return (
                <div key={s.spotNumber} className="bg-zinc-800/40 rounded-xl p-4 border border-zinc-700/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 text-xs w-5">{idx + 1}</span>
                      <span className="text-white font-mono font-semibold">Vaga {s.spotNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${labelCls}`}>{s.competitivenessLabel}</span>
                    </div>
                    <span className="text-zinc-300 text-sm">{s.useCount} usos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${barWidth}%` }} />
                    </div>
                    <span className="text-zinc-500 text-xs w-24 text-right">{s.averageDurationMinutes.toFixed(0)} min/sessão</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </BaseModal>
  );
}
