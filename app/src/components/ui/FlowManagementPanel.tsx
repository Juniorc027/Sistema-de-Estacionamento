'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertCircle, TrendingUp, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiService } from '@/services/api';
import { OccupancyTimelineDto } from '@/types/parking';

type FlowManagementPanelProps = {
  parkingLotId: string;
  onClose: () => void;
};

/**
 * Componente auxiliar para renderizar skeleton de loading
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, idx) => (
        <motion.div
          key={idx}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="rounded-lg bg-gradient-to-r from-zinc-800/60 to-zinc-900/40 p-4 h-24"
        />
      ))}
    </div>
  );
}

/**
 * Componente que renderiza um gráfico de barras com a ocupação por hora
 */
function OccupancyChart({ data }: { data: OccupancyTimelineDto }) {
  const maxOccupancy = Math.max(...(data.hours.map((h) => h.averageOccupancy) || [1]));

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-6">
      <h3 className="text-sm font-semibold text-zinc-200 mb-6 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        Ocupação por Hora
      </h3>

      {/* Gráfico com scroll horizontal para mobile */}
      <div className="overflow-x-auto pb-6">
        <div className="flex items-end gap-1 h-48 min-w-max pr-6">
          {data.hours.map((hourData, idx) => {
            const occupancyPercentage = hourData.averageOccupancy;
            const height = (occupancyPercentage / maxOccupancy) * 100;
            const hourNum = hourData.hour;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center group min-w-[50px]">
                {/* Bar */}
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-md transition-all duration-200 hover:from-emerald-400 hover:to-emerald-300 cursor-pointer group-hover:shadow-lg group-hover:shadow-emerald-500/50"
                  style={{
                    height: `${Math.max(height, 5)}%`,
                    minHeight: '4px',
                  }}
                  title={`${hourNum}h: ${occupancyPercentage.toFixed(1)}%`}
                />

                {/* Label */}
                <span className="text-[9px] text-zinc-500 mt-2 font-medium whitespace-nowrap">
                  {hourNum}h
                </span>

                {/* Percentage on hover */}
                <div className="opacity-0 group-hover:opacity-100 absolute top-0 translate-y-[-28px] bg-zinc-900 px-2 py-1 rounded-md text-[9px] font-semibold text-emerald-400 border border-emerald-500/50 pointer-events-none transition-opacity z-10">
                  {occupancyPercentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
        <div>Horário (24h)</div>
        <div>Ocupação (%)</div>
      </div>
    </div>
  );
}

/**
 * Componente que mostra estatísticas de fluxo
 */
function FlowStatistics({ data }: { data: OccupancyTimelineDto }) {
  const avgOccupancy =
    data.hours.reduce((sum, h) => sum + h.averageOccupancy, 0) / data.hours.length;
  const maxOccupancy = Math.max(...data.hours.map((h) => h.averageOccupancy));
  const minOccupancy = Math.min(...data.hours.map((h) => h.averageOccupancy));

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Average */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Ocupação Média
        </p>
        <p className="text-2xl font-bold text-emerald-400">
          {avgOccupancy.toFixed(1)}%
        </p>
      </div>

      {/* Peak */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Ocupação Máxima
        </p>
        <p className="text-2xl font-bold text-blue-400">
          {maxOccupancy.toFixed(1)}%
        </p>
      </div>

      {/* Minimum */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Ocupação Mínima
        </p>
        <p className="text-2xl font-bold text-zinc-400">
          {minOccupancy.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

/**
 * Painel Principal - Gestão de Fluxo
 * Mostra a timeline de ocupação do estacionamento ao longo do dia
 */
export function FlowManagementPanel({ parkingLotId, onClose }: FlowManagementPanelProps) {
  const [data, setData] = useState<OccupancyTimelineDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await ApiService.getOccupancyTimeline(parkingLotId);
        setData(result);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar dados';
        setError(errorMsg);
        console.error('[FlowManagementPanel] Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [parkingLotId]);

  /**
   * Função para exportar os dados de ocupação em CSV
   */
  const handleExportCsv = async () => {
    try {
      const blob = await ApiService.exportReportToCsv(parkingLotId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-ocupacao-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="flow-management"
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute inset-y-0 right-0 w-96 bg-gradient-to-br from-zinc-900 to-zinc-950 border-l border-zinc-700 shadow-2xl z-30 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700/50 bg-zinc-900/80">
          <div>
            <h2 className="text-xl font-bold text-white">Gestão de Fluxo</h2>
            <p className="text-xs text-zinc-400 mt-1">Ocupação em tempo real</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Botão Exportar */}
            <button
              onClick={handleExportCsv}
              className="p-2 rounded-lg hover:bg-emerald-800/30 text-emerald-400 hover:text-emerald-300 transition-colors"
              aria-label="Exportar dados em CSV"
              title="Exportar dados em CSV"
            >
              <Download className="w-5 h-5" />
            </button>
            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              aria-label="Fechar painel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && <LoadingSkeleton />}

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Erro ao carregar dados</p>
                <p className="text-xs text-red-300/70 mt-1">{error}</p>
              </div>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Statistics Cards */}
              <FlowStatistics data={data} />

              {/* Chart */}
              <OccupancyChart data={data} />
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
