'use client';

import { useEffect, useState } from 'react';
import { BaseModal } from './BaseModal';
import { ExportButtons } from './ExportButtons';
import { ApiService } from '@/services/api';
import { HistoryReportDto, PagedResult } from '@/types/parking';

const LOT_ID = process.env.NEXT_PUBLIC_PARKING_LOT_ID || '45fc18f2-bdd8-4b11-b964-f8face1147f0';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HistoricoModal({ open, onClose }: Props) {
  const [data, setData] = useState<PagedResult<HistoryReportDto> | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    ApiService.getReportHistory(LOT_ID, from, to, page, 10)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, from, to, page]);

  const formatDuration = (d: string | null | undefined) => {
    if (!d) return '-';
    const match = d.match(/(\d+):(\d+):(\d+)/);
    if (!match) return d;
    const h = parseInt(match[1]);
    const m = parseInt(match[2]);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  return (
    <BaseModal open={open} title="Histórico de Ocupação" subtitle="Entradas e saídas registradas por vaga" onClose={onClose}>
      {/* Filtros + Export */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Data Inicial</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Data Final</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <ExportButtons reportType="history" from={from} to={to} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-zinc-400">Carregando...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-zinc-500">Nenhum registro encontrado.</div>
      ) : (
        <>
          <div className="text-xs text-zinc-500 mb-3">{data.totalCount} registros encontrados</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Vaga</th>
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Placa</th>
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Entrada</th>
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Saída</th>
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Duração</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.sessionId} className="border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2 px-3 text-white font-mono">{row.spotNumber}</td>
                    <td className="py-2 px-3 text-zinc-300">{row.licensePlate}</td>
                    <td className="py-2 px-3 text-zinc-300">{new Date(row.entryTime.endsWith('Z') ? row.entryTime : row.entryTime + 'Z').toLocaleString('pt-BR')}</td>
                    <td className="py-2 px-3 text-zinc-300">{row.exitTime ? new Date(row.exitTime.endsWith('Z') ? row.exitTime : row.exitTime + 'Z').toLocaleString('pt-BR') : <span className="text-emerald-400">Em curso</span>}</td>
                    <td className="py-2 px-3 text-zinc-300">{formatDuration(row.duration as unknown as string)}</td>
                    <td className="py-2 px-3 text-right text-emerald-400 font-medium">R$ {row.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 text-sm">
                ← Anterior
              </button>
              <span className="text-zinc-400 text-sm">{page} / {data.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
                className="px-3 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 text-sm">
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </BaseModal>
  );
}
