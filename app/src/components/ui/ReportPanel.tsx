'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, TrendingUp, Clock, BarChart3, AlertCircle, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiService } from '@/services/api';
import {
  HistoryReportDto,
  HourlyOccupancyDto,
  AverageDurationReportDto,
  SpotRankingDto,
  ReportId,
} from '@/types/parking';

type ReportPanelProps = {
  reportId: ReportId | null;
  parkingLotId: string;
  onClose: () => void;
};

const reportTitles: Record<ReportId, string> = {
  history: 'Histórico Completo',
  occupancy: 'Ocupação por Hora',
  duration: 'Tempo Médio de Permanência',
  ranking: 'Ranking de Vagas',
};

/**
 * Função auxiliar para exportar relatório em CSV
 * Faz download do arquivo no browser
 */
const handleExportCsv = async (reportId: ReportId, parkingLotId: string) => {
  try {
    const blob = await ApiService.exportReportToCsv(reportId, parkingLotId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-${reportId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    alert('Erro ao exportar dados. Tente novamente.');
  }
};

function HistoryReport({ parkingLotId }: { parkingLotId: string }) {
  const [data, setData] = useState<HistoryReportDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await ApiService.getReportHistory(parkingLotId, undefined, undefined, 1, 5);
        setData(result.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [parkingLotId]);

  if (loading) {
    return <div className="text-center py-8 text-zinc-400">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <table className="w-full text-xs text-zinc-300">
        <thead>
          <tr className="text-zinc-400 border-b border-zinc-700">
            <th className="text-left py-2">Vaga</th>
            <th className="text-left py-2">Placa</th>
            <th className="text-left py-2">Entrada</th>
            <th className="text-right py-2">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {data?.map((row, idx) => (
            <tr key={idx} className="hover:bg-zinc-800/50 transition">
              <td className="py-2 font-medium">{row.spotNumber}</td>
              <td className="py-2">{row.licensePlate}</td>
              <td className="py-2 text-zinc-400">{new Date(row.entryTime).toLocaleTimeString('pt-BR')}</td>
              <td className="py-2 text-right text-emerald-400">R$ {row.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OccupancyReport({ parkingLotId }: { parkingLotId: string }) {
  const [data, setData] = useState<HourlyOccupancyDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await ApiService.getReportHourlyOccupancy(parkingLotId);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [parkingLotId]);

  if (loading) {
    return <div className="text-center py-8 text-zinc-400">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  const maxOccupancy = Math.max(...(data?.map((d) => Number(d.averageOccupancy)) || [1]));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4">
        <div className="flex items-end gap-1 h-40">
          {data?.map((hourData, idx) => {
            const hourNum = new Date(hourData.hour).getHours();
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all hover:from-emerald-400 hover:to-emerald-300"
                  style={{ height: `${(Number(hourData.averageOccupancy) / maxOccupancy) * 100}%`, minHeight: '2px' }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 bg-zinc-900 text-emerald-400 text-[10px] px-2 py-1 rounded whitespace-nowrap mb-1">
                    {hourData.peakOccupiedCount}/{hourData.totalSpots}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 mt-1">{hourNum}h</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <p className="text-[11px] text-zinc-400 uppercase">Pico de Ocupação</p>
          <p className="text-lg font-semibold text-emerald-400 mt-1">
            {Math.max(...(data?.map((d) => d.peakOccupiedCount) || [0]))} vagas
          </p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <p className="text-[11px] text-zinc-400 uppercase">Total de Vagas</p>
          <p className="text-lg font-semibold text-blue-400 mt-1">{data?.[0]?.totalSpots || 22}</p>
        </div>
      </div>
    </div>
  );
}

function DurationReport({ parkingLotId }: { parkingLotId: string }) {
  const [data, setData] = useState<AverageDurationReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parseTimeSpan = (timeSpanStr: string | null | undefined): number => {
    if (!timeSpanStr) return 0;
    // TimeSpan format: "HH:MM:SS.mmm"
    const parts = timeSpanStr.split(':');
    if (parts.length < 3) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    return hours * 60 + minutes + seconds / 60;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await ApiService.getReportAverageDuration(parkingLotId);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [parkingLotId]);

  if (loading) {
    return <div className="text-center py-8 text-zinc-400">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  const avgMin = parseTimeSpan(data?.averageDuration);
  const minMin = parseTimeSpan(data?.minimumDuration);
  const maxMin = parseTimeSpan(data?.maximumDuration);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <p className="text-[11px] text-zinc-400 uppercase">Média</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{avgMin.toFixed(1)}min</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <p className="text-[11px] text-zinc-400 uppercase">Sessões</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{data?.totalSessions}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <p className="text-[11px] text-zinc-400 uppercase">Mínima</p>
          <p className="text-lg font-semibold text-orange-400 mt-1">{minMin > 0 ? minMin.toFixed(1) : '—'}min</p>
        </div>
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3">
          <p className="text-[11px] text-zinc-400 uppercase">Máxima</p>
          <p className="text-lg font-semibold text-orange-400 mt-1">{maxMin > 0 ? maxMin.toFixed(1) : '—'}min</p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
        <p className="text-xs font-medium text-zinc-300 mb-2">Sessões por Período</p>
        <div className="space-y-1 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Hoje</span>
            <span className="text-emerald-400">{data?.sessionsToday}</span>
          </div>
          <div className="flex justify-between">
            <span>Esta Semana</span>
            <span className="text-emerald-400">{data?.sessionsThisWeek}</span>
          </div>
          <div className="flex justify-between">
            <span>Este Mês</span>
            <span className="text-emerald-400">{data?.sessionsThisMonth}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RankingReport({ parkingLotId }: { parkingLotId: string }) {
  const [data, setData] = useState<SpotRankingDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const result = await ApiService.getReportSpotRanking(parkingLotId);
        setData(result.slice(0, 10));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [parkingLotId]);

  if (loading) {
    return <div className="text-center py-8 text-zinc-400">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data?.map((spot, idx) => (
        <div key={idx} className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-3 hover:bg-zinc-800/60 transition">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-white">Vaga {spot.spotNumber}</span>
            <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">#{idx + 1}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-zinc-400">
            <div>
              <p className="uppercase text-[10px]">Uso</p>
              <p className="text-emerald-400 font-medium">{spot.useCount}x</p>
            </div>
            <div>
              <p className="uppercase text-[10px]">Duração Média</p>
              <p className="text-blue-400 font-medium">{Number(spot.averageDurationMinutes).toFixed(1)}min</p>
            </div>
            <div>
              <p className="uppercase text-[10px]">Ocupação</p>
              <p className="text-orange-400 font-medium">{Number(spot.occupancyRate).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportPanel({ reportId, parkingLotId, onClose }: ReportPanelProps) {
  // Estado local para abas dentro do ReportPanel
  const [activeTab, setActiveTab] = useState<ReportId>(reportId || 'history');

  // Atualizar aba se reportId mudar externamente
  useEffect(() => {
    if (reportId) {
      setActiveTab(reportId);
    }
  }, [reportId]);

  const tabs: { id: ReportId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'history', label: 'Histórico', icon: X },
    { id: 'occupancy', label: 'Ocupação', icon: BarChart3 },
    { id: 'duration', label: 'Duração', icon: Clock },
    { id: 'ranking', label: 'Ranking', icon: TrendingUp },
  ];

  const renderContent = () => {
    const currentTab = activeTab || 'history';
    switch (currentTab) {
      case 'history':
        return <HistoryReport parkingLotId={parkingLotId} />;
      case 'occupancy':
        return <OccupancyReport parkingLotId={parkingLotId} />;
      case 'duration':
        return <DurationReport parkingLotId={parkingLotId} />;
      case 'ranking':
        return <RankingReport parkingLotId={parkingLotId} />;
      default:
        return null;
    }
  };

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
            <header className="border-b border-zinc-700/70 flex items-center justify-between px-5 pt-4 pb-0">
              <div className="pb-4">
                <h2 className="text-white font-semibold">Relatórios Detalhados</h2>
                <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-400">Painel de Análise</p>
              </div>

              <div className="flex items-center gap-2 pb-4">
                {/* Botão Exportar CSV */}
                <button
                  type="button"
                  onClick={() => activeTab && handleExportCsv(activeTab, parkingLotId)}
                  className="h-9 px-3 rounded-lg text-sm border border-blue-600/50 text-blue-300 hover:text-blue-200 hover:border-blue-500 hover:bg-blue-800/30 transition flex items-center gap-2"
                  title="Exportar relatório em CSV"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>

                {/* Botão Fechar */}
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 px-3 rounded-lg text-sm border border-zinc-600 text-zinc-200 hover:text-white hover:border-zinc-500 hover:bg-zinc-800/80 transition"
                >
                  <span className="inline-flex items-center gap-2">
                    <X className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </header>

            {/* Tabs Navigation */}
            <div className="flex border-b border-zinc-700/70 bg-zinc-800/30 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-emerald-400 text-emerald-400'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {renderContent()}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
