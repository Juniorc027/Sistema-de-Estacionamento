'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Users, Clock, AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { TimePeriod, DashboardOverviewDto, SpotRankingItemDto } from '@/types/parking';
import { ApiService } from '@/services/api';

// ============= TIPOS LOCAIS =============

interface DashboardPanelProps {
  parkingLotId: string;
  onSpotClick?: (spotId: string, spotNumber: string) => void;
}

// ============= SKELETON SCREENS PARA LOADING =============

interface KpiCardSkeletonProps {
  count?: number;
}

function KpiCardSkeleton({ count = 3 }: KpiCardSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <motion.div
          key={idx}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="rounded-xl border border-zinc-700 bg-gradient-to-br from-zinc-800/60 to-zinc-900/40 p-4 h-32"
        />
      ))}
    </div>
  );
}

function RankingSkeletonItem() {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="rounded-lg border border-zinc-700/40 p-3 h-20 bg-gradient-to-r from-blue-600/20 to-transparent"
    />
  );
}

// ============= COMPONENTES AUXILIARES =============

interface DonutChartProps {
  percentage: number;
  size?: number;
  color?: string;
}

function DonutChart({ percentage, size = 120, color = '#10b981' }: DonutChartProps) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * ((100 - percentage) / 100);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-zinc-700"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
}

interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  subtitle?: string;
  chart?: React.ReactNode;
}

function KpiCard({ title, value, unit, icon: Icon, trend, subtitle, chart }: KpiCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl border border-zinc-700 bg-gradient-to-br from-zinc-800/60 to-zinc-900/40 p-4 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{value}</span>
            {unit && <span className="text-sm text-zinc-400">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        {chart ? (
          chart
        ) : (
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-emerald-400" />
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 text-xs">
          {trend >= 0 ? (
            <>
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">+{trend.toFixed(1)}%</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-3 h-3 text-red-400" />
              <span className="text-red-400">{trend.toFixed(1)}%</span>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface SpotRankingCardProps {
  spot: SpotRankingItemDto;
  onClick?: () => void;
}

function SpotRankingCard({ spot, onClick }: SpotRankingCardProps) {
  // Calcular opacidade do heatmap: quanto maior o entryCount, mais opaco
  const maxEntries = 100; // Normalizar a 100 entradas como máximo
  const heatmapOpacity = Math.min(100, (spot.entryCount / maxEntries) * 100);
  const normalizedOpacity = 10 + (heatmapOpacity / 100) * 30; // 10% a 40%

  // Determinar cor da barra de progresso baseada na taxa de utilização
  const barColor = spot.utilizationRate > 80 ? 'bg-red-500' : spot.utilizationRate > 50 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <motion.button
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      type="button"
      className="w-full text-left"
    >
      <div
        className={`rounded-lg border border-zinc-700/40 p-3 backdrop-blur-sm transition-all duration-300 hover:border-zinc-600 bg-gradient-to-r from-blue-600/20 to-transparent`}
        style={{
          opacity: 0.6 + (heatmapOpacity / 100) * 0.4,
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center bg-zinc-700 text-zinc-200">
              {spot.rank}
            </span>
            <span className="font-semibold text-white">Vaga {spot.spotNumber}</span>
            {spot.badge && <span className="text-lg">{spot.badge}</span>}
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded ${spot.currentStatus === 'Ocupada' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {spot.currentStatus}
          </span>
        </div>

        {/* Barra de Progresso */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${Math.min(100, spot.utilizationRate)}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-zinc-400 w-8 text-right">{spot.utilizationRate.toFixed(0)}%</span>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-400">
          <span>Uso: {spot.entryCount}x</span>
          <span>Avg: {spot.averageOccupancyMinutes.toFixed(0)}min</span>
        </div>
      </div>
    </motion.button>
  );
}

// ============= COMPONENTE PRINCIPAL =============

export function DashboardPanel({ parkingLotId, onSpotClick }: DashboardPanelProps) {
  const [dashboardData, setDashboardData] = useState<DashboardOverviewDto | null>(null);
  const [topSpots, setTopSpots] = useState<SpotRankingItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados ao montar e a cada parkingLotId
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Chamada real à API do novo DashboardService
        const overview = await ApiService.getDashboardOverview(parkingLotId);
        setDashboardData(overview);
        setTopSpots(overview.topSpots || []);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [parkingLotId]);

  const handleSpotClick = useCallback(
    (spotId: string, spotNumber: string) => {
      if (onSpotClick) {
        onSpotClick(spotId, spotNumber);
      }
    },
    [onSpotClick]
  );

  return (
    <motion.aside
      initial={{ x: 400 }}
      animate={{ x: 0 }}
      exit={{ x: 400 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="absolute right-0 top-0 bottom-0 w-96 bg-zinc-900/95 border-l border-zinc-800 backdrop-blur-lg shadow-2xl overflow-y-auto"
    >
      <div className="h-full flex flex-col p-4 space-y-5">
        {/* Header */}
        <div className="flex-shrink-0">
          <h2 className="text-lg font-bold text-white mb-2">Dashboard</h2>
          <p className="text-xs text-zinc-400">Dados em Tempo Real - {dashboardData?.parkingLotName}</p>
        </div>

        {/* KPI Section */}
        {loading ? (
          <div className="space-y-5 flex-shrink-0">
            {/* KPI Skeleton Cards */}
            <KpiCardSkeleton count={3} />
            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
            {/* Ranking Skeleton */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-shrink-0 mb-3">
                <h3 className="text-sm font-semibold text-white mb-1">Top 5 Vagas</h3>
                <p className="text-xs text-zinc-400">Por frequência de uso</p>
              </div>
              <div className="flex-1 space-y-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <RankingSkeletonItem key={idx} />
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/50">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            {dashboardData && (
              <div className="space-y-3 flex-shrink-0">
                {/* Card 1: Ocupação Atual */}
                <KpiCard
                  title="Ocupação Atual"
                  value={dashboardData.occupancy.occupancyPercentage.toFixed(0)}
                  unit="%"
                  icon={Users}
                  trend={dashboardData.occupancy.trendPercentage}
                  subtitle={`${dashboardData.occupancy.occupiedSpots}/${dashboardData.occupancy.totalSpots} vagas`}
                  chart={
                    <DonutChart
                      percentage={dashboardData.occupancy.occupancyPercentage}
                      size={100}
                      color={
                        dashboardData.occupancy.occupancyPercentage > 80
                          ? '#ef4444'
                          : dashboardData.occupancy.occupancyPercentage > 50
                            ? '#f59e0b'
                            : '#10b981'
                      }
                    />
                  }
                />

                {/* Card 2: Entradas 24h */}
                <KpiCard
                  title="Entradas 24h"
                  value={dashboardData.throughput.entriesLast24Hours}
                  icon={Users}
                  subtitle={`Média: ${dashboardData.throughput.averageEntriesPerHour.toFixed(0)}/h`}
                />

                {/* Card 3: Horário de Pico */}
                <KpiCard
                  title="Horário de Pico"
                  value={`${dashboardData.peakHour.hour}:00h`}
                  icon={Clock}
                  subtitle={`Ocupação: ${dashboardData.peakHour.occupancyPercentage.toFixed(0)}% | ${dashboardData.peakHour.entriesCount} entradas`}
                />
              </div>
            )}

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

            {/* Ranking Section */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-shrink-0 mb-3">
                <h3 className="text-sm font-semibold text-white mb-1">Top Vagas</h3>
                <p className="text-xs text-zinc-400">Por taxa de utilização</p>
              </div>

              {/* Ranking List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                <style>{`
                  .ranking-scroll::-webkit-scrollbar {
                    width: 4px;
                  }
                  .ranking-scroll::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .ranking-scroll::-webkit-scrollbar-thumb {
                    background: rgba(113, 113, 122, 0.5);
                    border-radius: 2px;
                  }
                  .ranking-scroll::-webkit-scrollbar-thumb:hover {
                    background: rgba(113, 113, 122, 0.8);
                  }
                `}</style>
                <div className="ranking-scroll space-y-2">
                  {topSpots.map((spot) => (
                    <SpotRankingCard
                      key={spot.spotId}
                      spot={spot}
                      onClick={() => handleSpotClick(spot.spotId, spot.spotNumber)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Info */}
            <div className="flex-shrink-0 text-[10px] text-zinc-500 pt-3 border-t border-zinc-800">
              <p>Atualizado em {dashboardData ? new Date(dashboardData.lastUpdated).toLocaleTimeString('pt-BR') : 'agora'}</p>
            </div>
          </>
        )}
      </div>
    </motion.aside>
  );
}
