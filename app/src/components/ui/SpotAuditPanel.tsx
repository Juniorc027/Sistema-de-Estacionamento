'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertCircle, Trophy, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiService } from '@/services/api';
import { SpotStatisticsDto } from '@/types/parking';

type SpotAuditPanelProps = {
  parkingLotId: string;
  onClose: () => void;
};

/**
 * Componente auxiliar para renderizar skeleton de loading
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, idx) => (
        <motion.div
          key={idx}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="rounded-lg bg-gradient-to-r from-zinc-800/60 to-zinc-900/40 p-4 h-16"
        />
      ))}
    </div>
  );
}

/**
 * Componente que mostra um item do ranking com informações de auditoria
 */
interface SpotCardProps {
  rank: number;
  spotNumber: string;
  utilizationRate: number;
  averageOccupancyMinutes: number;
  entryCount: number;
}

function SpotCard({
  rank,
  spotNumber,
  utilizationRate,
  averageOccupancyMinutes,
  entryCount,
}: SpotCardProps) {
  // ═══════════════════════════════════════════
  // CALCULAR: Status de Saúde (baseado em tempo médio de ocupação)
  // ═══════════════════════════════════════════
  const getHealthStatus = (avgOccupancyMin: number) => {
    if (avgOccupancyMin > 180) return { label: 'Alto Tempo', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' };
    if (avgOccupancyMin > 120) return { label: 'Tempo Normal', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
    return { label: 'Tempo Baixo', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' };
  };

  // ═══════════════════════════════════════════
  // CALCULAR: Eficiência (baseada em taxa de utilização)
  // ═══════════════════════════════════════════
  const getEfficiency = (rate: number) => {
    if (rate >= 80) return { label: 'Excelente', color: 'text-emerald-400', icon: '✨' };
    if (rate >= 60) return { label: 'Boa', color: 'text-blue-400', icon: '👍' };
    if (rate >= 40) return { label: 'Média', color: 'text-yellow-400', icon: '⚠️' };
    return { label: 'Baixa', color: 'text-red-400', icon: '❌' };
  };

  // ═══════════════════════════════════════════
  // CALCULAR: Badge de Uso (Alto Tráfego vs Ocioso)
  // ═══════════════════════════════════════════
  const getTrafficBadge = (rate: number, entries: number) => {
    if (rate >= 75 && entries >= 30) {
      return { label: 'Alto Tráfego', color: 'bg-red-500/30 border-red-500/50 text-red-300', emoji: '🔥' };
    }
    if (rate >= 50) {
      return { label: 'Médio Tráfego', color: 'bg-yellow-500/30 border-yellow-500/50 text-yellow-300', emoji: '📊' };
    }
    return { label: 'Ocioso', color: 'bg-blue-500/30 border-blue-500/50 text-blue-300', emoji: '💤' };
  };

  const health = getHealthStatus(averageOccupancyMinutes);
  const efficiency = getEfficiency(utilizationRate);
  const traffic = getTrafficBadge(utilizationRate, entryCount);

  const getColorByRank = (index: number) => {
    if (index === 1) return 'from-yellow-500/30 to-yellow-500/10 border-yellow-500/50';
    if (index === 2) return 'from-slate-400/30 to-slate-400/10 border-slate-400/50';
    if (index === 3) return 'from-orange-600/30 to-orange-600/10 border-orange-600/50';
    return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
  };

  const getMedalEmoji = (index: number) => {
    if (index === 1) return '🥇';
    if (index === 2) return '🥈';
    if (index === 3) return '🥉';
    return '🎯';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`rounded-lg border bg-gradient-to-r p-4 transition-all hover:shadow-lg hover:shadow-emerald-500/10 ${getColorByRank(rank)}`}
    >
      {/* Header com Rank e Badge de Tráfego */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Rank Badge */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800/60 border border-zinc-700 flex-shrink-0">
            <span className="text-lg">{getMedalEmoji(rank)}</span>
          </div>

          {/* Vaga Info */}
          <div>
            <h3 className="text-sm font-bold text-white">Vaga {spotNumber}</h3>
            <p className="text-xs text-zinc-400">#{rank}º lugar</p>
          </div>
        </div>

        {/* Badge de Tráfego */}
        <div className={`px-2 py-1 rounded border text-xs font-semibold ${traffic.color}`}>
          {traffic.emoji} {traffic.label}
        </div>
      </div>

      {/* Metricas Principais */}
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        {/* Taxa de Utilização */}
        <div className="rounded bg-zinc-800/50 p-2">
          <p className="text-zinc-500 mb-1">Taxa de Uso</p>
          <p className="font-bold text-emerald-400">{utilizationRate.toFixed(1)}%</p>
          <div className="mt-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${Math.min(utilizationRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Entradas */}
        <div className="rounded bg-zinc-800/50 p-2">
          <p className="text-zinc-500 mb-1">Entradas</p>
          <p className="font-bold text-blue-400">{entryCount}</p>
        </div>

        {/* Tempo Médio de Ocupação */}
        <div className="rounded bg-zinc-800/50 p-2">
          <p className="text-zinc-500 mb-1">Tempo Médio</p>
          <p className="font-bold text-purple-400">
            {averageOccupancyMinutes < 60 ? `${Math.round(averageOccupancyMinutes)}m` : `${(averageOccupancyMinutes / 60).toFixed(1)}h`}
          </p>
        </div>
      </div>

      {/* Status de Saúde + Eficiência */}
      <div className="grid grid-cols-2 gap-2">
        {/* Status de Saúde */}
        <div className={`rounded border p-2 text-xs font-semibold text-center ${health.bg} ${health.border}`}>
          <p className="text-zinc-400 text-[10px] mb-1">Saúde</p>
          <p className={health.color}>{health.label}</p>
        </div>

        {/* Eficiência */}
        <div className="rounded border border-zinc-700/50 bg-zinc-800/30 p-2 text-xs font-semibold text-center">
          <p className="text-zinc-400 text-[10px] mb-1">Eficiência</p>
          <p className={efficiency.color}>
            {efficiency.icon} {efficiency.label}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Componente que mostra o sumário de estatísticas
 */
function StatisticsSummary({ data }: { data: SpotStatisticsDto }) {
  const totalEntries = data.spots.reduce((sum, spot) => sum + (spot.entryCount || 0), 0);
  const avgUtilization =
    data.spots.reduce((sum, spot) => sum + Number(spot.utilizationRate), 0) / data.spots.length;
  const avgOccupancy =
    data.spots.reduce((sum, spot) => sum + (spot.averageOccupancyMinutes || 0), 0) /
    data.spots.length;

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {/* Total Entries */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Total de Entradas
        </p>
        <p className="text-2xl font-bold text-blue-400">{totalEntries}</p>
      </div>

      {/* Avg Utilization */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Uso Médio
        </p>
        <p className="text-2xl font-bold text-emerald-400">{avgUtilization.toFixed(1)}%</p>
      </div>

      {/* Avg Occupancy */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-4">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Tempo Médio
        </p>
        <p className="text-2xl font-bold text-purple-400">
          {avgOccupancy < 60 ? `${Math.round(avgOccupancy)}m` : `${(avgOccupancy / 60).toFixed(1)}h`}
        </p>
      </div>
    </div>
  );
}

/**
 * Painel Principal - Auditoria de Vagas
 * Mostra o ranking completo das vagas com taxa de uso e tempo médio
 */
export function SpotAuditPanel({ parkingLotId, onClose }: SpotAuditPanelProps) {
  const [data, setData] = useState<SpotStatisticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'usage' | 'duration' | 'sessions'>('usage');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await ApiService.getSpotStatistics(parkingLotId);
        setData(result);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar dados';
        setError(errorMsg);
        console.error('[SpotAuditPanel] Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [parkingLotId]);

  /**
   * Ordena os spots de acordo com o critério selecionado
   */
  const sortedSpots = data?.spots
    ? [...data.spots].sort((a, b) => {
        switch (sortBy) {
          case 'usage':
            return Number(b.utilizationRate) - Number(a.utilizationRate);
          case 'duration':
            return (b.averageOccupancyMinutes || 0) - (a.averageOccupancyMinutes || 0);
          case 'sessions':
            return (b.entryCount || 0) - (a.entryCount || 0);
          default:
            return 0;
        }
      })
    : [];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="spot-audit"
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute inset-y-0 right-0 w-96 bg-gradient-to-br from-zinc-900 to-zinc-950 border-l border-zinc-700 shadow-2xl z-30 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700/50 bg-zinc-900/80">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Auditoria de Vagas
            </h2>
            <p className="text-xs text-zinc-400 mt-1">Ranking e estatísticas</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            aria-label="Fechar painel"
          >
            <X className="w-5 h-5" />
          </button>
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
              {/* Summary Stats */}
              <StatisticsSummary data={data} />

              {/* Sort Controls */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSortBy('usage')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    sortBy === 'usage'
                      ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-300'
                      : 'bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  Uso
                </button>
                <button
                  onClick={() => setSortBy('sessions')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    sortBy === 'sessions'
                      ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300'
                      : 'bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  📊 Sessões
                </button>
                <button
                  onClick={() => setSortBy('duration')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    sortBy === 'duration'
                      ? 'bg-purple-500/30 border border-purple-500/50 text-purple-300'
                      : 'bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  ⏱️ Duração
                </button>
              </div>

              {/* Ranking List */}
              <div className="space-y-3">
                {sortedSpots.map((spot, idx) => (
                  <SpotCard
                    key={spot.spotNumber}
                    rank={idx + 1}
                    spotNumber={spot.spotNumber}
                    utilizationRate={Number(spot.utilizationRate)}
                    averageOccupancyMinutes={spot.averageOccupancyMinutes || 0}
                    entryCount={spot.entryCount || 0}
                  />
                ))}
              </div>

              {/* Info */}
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/20 p-4 text-xs text-zinc-400">
                <p className="mb-2 font-semibold">ℹ️ Sobre as Métricas</p>
                <ul className="space-y-1 text-zinc-500">
                  <li>• <strong>Taxa de Uso:</strong> % de utilização da vaga</li>
                  <li>• <strong>Entradas:</strong> Número total de veículos</li>
                  <li>• <strong>Tempo Médio:</strong> Tempo médio de ocupação</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
