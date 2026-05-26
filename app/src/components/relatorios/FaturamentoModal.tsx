'use client';

import { useEffect, useState } from 'react';
import { BaseModal } from './BaseModal';
import { ExportButtons } from './ExportButtons';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5167';
const LOT_ID = process.env.NEXT_PUBLIC_PARKING_LOT_ID || '45fc18f2-bdd8-4b11-b964-f8face1147f0';

interface RevenueDayDto { date: string; sessionsCount: number; revenue: number; averageDurationMinutes: number; }
interface RevenueSpotDto { spotNumber: string; sessionsCount: number; revenue: number; averageDurationMinutes: number; }
interface RevenueData {
  totalRevenue: number; sessionsCount: number; averageTicket: number;
  ratePerMinute: number; from: string; to: string;
  perDay: RevenueDayDto[]; perSpot: RevenueSpotDto[];
}

interface Props { open: boolean; onClose: () => void; }

export function FaturamentoModal({ open, onClose }: Props) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'dia' | 'vaga'>('dia');
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`${API_URL}/api/reports/revenue?parkingLotId=${LOT_ID}&from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, from, to]);

  return (
    <BaseModal open={open} title="Faturamento" subtitle={`Tarifa: R$ ${data?.ratePerMinute?.toFixed(2) ?? '5,00'}/min`} onClose={onClose}>
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
        <ExportButtons reportType="revenue" from={from} to={to} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-zinc-400">Carregando...</div>
      ) : !data ? (
        <div className="flex items-center justify-center h-40 text-zinc-500">Nenhum dado encontrado.</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-1">Faturamento Total</p>
              <p className="text-2xl font-bold text-emerald-400">R$ {data.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-1">Sessões</p>
              <p className="text-2xl font-bold text-white">{data.sessionsCount}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold text-amber-400">R$ {data.averageTicket.toFixed(2)}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => setTab('dia')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'dia' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>Por Dia</button>
            <button onClick={() => setTab('vaga')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'vaga' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>Por Vaga</button>
          </div>

          {tab === 'dia' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-2 px-3 text-zinc-400 font-medium">Data</th>
                    <th className="text-right py-2 px-3 text-zinc-400 font-medium">Sessões</th>
                    <th className="text-right py-2 px-3 text-zinc-400 font-medium">Faturamento</th>
                    <th className="text-right py-2 px-3 text-zinc-400 font-medium">Dur. Média</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perDay.map((d) => (
                    <tr key={d.date} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                      <td className="py-2 px-3 text-zinc-300">{new Date(d.date).toLocaleDateString('pt-BR')}</td>
                      <td className="py-2 px-3 text-right text-white">{d.sessionsCount}</td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-medium">R$ {d.revenue.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-zinc-300">{d.averageDurationMinutes.toFixed(0)} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left py-2 px-3 text-zinc-400 font-medium">Vaga</th>
                    <th className="text-right py-2 px-3 text-zinc-400 font-medium">Sessões</th>
                    <th className="text-right py-2 px-3 text-zinc-400 font-medium">Faturamento</th>
                    <th className="text-right py-2 px-3 text-zinc-400 font-medium">Dur. Média</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perSpot.map((s) => (
                    <tr key={s.spotNumber} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                      <td className="py-2 px-3 text-white font-mono">{s.spotNumber}</td>
                      <td className="py-2 px-3 text-right text-white">{s.sessionsCount}</td>
                      <td className="py-2 px-3 text-right text-emerald-400 font-medium">R$ {s.revenue.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-zinc-300">{s.averageDurationMinutes.toFixed(0)} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </BaseModal>
  );
}
