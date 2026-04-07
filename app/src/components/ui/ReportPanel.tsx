'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ReportId } from './Sidebar';

type ReportPanelProps = {
  reportId: ReportId | null;
  onClose: () => void;
};

const reportTitles: Record<ReportId, string> = {
  history: 'Histórico Completo',
  'hourly-occupancy': 'Ocupação por Hora',
  'average-duration': 'Tempo Médio de Permanência',
  'spot-ranking': 'Ranking de Vagas'
};

const skeletonBars = ['w-5/6', 'w-full', 'w-4/6', 'w-3/4'];

function PlaceholderContent({ reportId }: { reportId: ReportId }) {
  const title = reportTitles[reportId];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/60 p-4">
        <p className="text-sm font-medium text-zinc-200">Visão Geral</p>
        <p className="text-xs text-zinc-400 mt-1">Dados virão do backend</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Indicador A</p>
            <div className="h-6 mt-2 rounded bg-zinc-700/60" />
          </div>
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-3">
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Indicador B</p>
            <div className="h-6 mt-2 rounded bg-zinc-700/60" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/60 p-4">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-400 mt-1">Gráfico placeholder</p>
        <div className="mt-4 h-40 rounded-lg border border-zinc-700 bg-gradient-to-b from-zinc-900/90 to-zinc-800/80 p-4 flex items-end gap-2">
          {[28, 54, 36, 72, 44, 62].map((height, index) => (
            <div key={index} className="flex-1 rounded-t bg-emerald-500/40" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/60 p-4">
        <p className="text-sm font-medium text-zinc-200">Tabela de Eventos</p>
        <p className="text-xs text-zinc-400 mt-1">Dados virão do backend</p>
        <div className="mt-4 space-y-2">
          {skeletonBars.map((bar, index) => (
            <div key={index} className={`h-8 rounded-md bg-zinc-700/60 ${bar}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReportPanel({ reportId, onClose }: ReportPanelProps) {
  return (
    <AnimatePresence>
      {reportId && (
        <motion.aside
          key={reportId}
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="absolute right-0 top-0 z-30 h-full w-[420px] lg:w-[480px] border-l border-zinc-700/70 bg-zinc-900/85 backdrop-blur-md shadow-2xl"
        >
          <div className="h-full flex flex-col">
            <header className="h-16 border-b border-zinc-700/70 flex items-center justify-between px-5">
              <div>
                <h2 className="text-white font-semibold">{reportTitles[reportId]}</h2>
                <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-400">Relatório</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3 rounded-lg text-sm border border-zinc-600 text-zinc-200 hover:text-white hover:border-zinc-500 hover:bg-zinc-800/80 transition"
              >
                <span className="inline-flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Fechar
                </span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              <PlaceholderContent reportId={reportId} />
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
