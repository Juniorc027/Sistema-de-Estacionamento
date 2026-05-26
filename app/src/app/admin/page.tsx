'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car, TrendingUp, DollarSign, CalendarDays,
  Trophy, ArrowLeft, RefreshCw, Wifi, WifiOff,
  Activity, Clock, Hash, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signalRService } from '@/services/signalr';
import { ParkingSpotStatus } from '@/types/parking';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5167';
const LOT_ID = process.env.NEXT_PUBLIC_PARKING_LOT_ID || '45fc18f2-bdd8-4b11-b964-f8face1147f0';

// ── Types ──────────────────────────────────────────────────────────────────────
interface TopSpot {
  spotNumber: string;
  useCount: number;
  averageDurationMinutes: number;
  currentStatus: string;
}

interface Overview {
  parkingLotName: string;
  totalSpots: number;
  occupiedSpots: number;
  freeSpots: number;
  occupancyPercentage: number;
  revenueTodayTotal: number;
  sessionsTodayCount: number;
  averageTicketToday: number;
  monthlyRevenueEstimate: number;
  monthlyRevenueSoFar: number;
  dailyAverageRevenue: number;
  daysElapsedInMonth: number;
  daysInMonth: number;
  topSpots: TopSpot[];
  generatedAt: string;
}

interface LogEntry {
  id: string;
  event: string;
  description: string | null;
  source: string | null;
  occurredAt: string;
}

interface LogsResult {
  items: LogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Real-time log from SignalR ─────────────────────────────────────────────────
interface LiveLogEntry {
  id: string;
  event: string;
  description: string;
  occurredAt: Date;
  isLive: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTime(iso: string) {
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function eventColor(event: string) {
  if (event.includes('OCCUPIED') || event.includes('ENTRY')) return 'text-amber-400';
  if (event.includes('RELEASED') || event.includes('EXIT') || event.includes('FREE')) return 'text-emerald-400';
  if (event.includes('ERROR') || event.includes('FAIL')) return 'text-red-400';
  return 'text-blue-400';
}

function eventIcon(event: string) {
  if (event.includes('OCCUPIED') || event.includes('ENTRY')) return <Car className="w-3.5 h-3.5" />;
  if (event.includes('RELEASED') || event.includes('EXIT') || event.includes('FREE')) return <CheckCircle2 className="w-3.5 h-3.5" />;
  if (event.includes('ERROR') || event.includes('FAIL')) return <AlertCircle className="w-3.5 h-3.5" />;
  return <Activity className="w-3.5 h-3.5" />;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-2"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [liveLogs, setLiveLogs] = useState<LiveLogEntry[]>([]);
  const [dbLogs, setDbLogs] = useState<LogEntry[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [signalrConnected, setSignalrConnected] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/overview/${LOT_ID}`);
      if (r.ok) {
        const d: Overview = await r.json();
        setOverview(d);
        setLastRefresh(new Date());
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/admin/logs/${LOT_ID}?page=1&pageSize=50`);
      if (r.ok) {
        const d: LogsResult = await r.json();
        setDbLogs(d.items);
      }
    } catch {
      // silently ignore
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // Auto-refresh overview every 30 seconds
  useEffect(() => {
    fetchOverview();
    fetchLogs();
    const interval = setInterval(() => {
      fetchOverview();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchOverview, fetchLogs]);

  // SignalR for real-time log entries
  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      try {
        await signalRService.start();
        await signalRService.joinParkingLot(LOT_ID);
        if (mounted) setSignalrConnected(true);

        signalRService.onSpotUpdated((spot) => {
          if (!mounted) return;
          const isOccupied = spot.status === ParkingSpotStatus.Occupied;
          const entry: LiveLogEntry = {
            id: `live-${Date.now()}-${Math.random()}`,
            event: isOccupied ? 'SPOT_OCCUPIED' : 'SPOT_RELEASED',
            description: isOccupied
              ? `Vaga ${spot.spotNumber} ficou ocupada`
              : `Vaga ${spot.spotNumber} foi liberada`,
            occurredAt: new Date(),
            isLive: true,
          };
          setLiveLogs((prev) => [entry, ...prev].slice(0, 100));
          // Refresh overview to get updated counts
          fetchOverview();
        });
      } catch {
        if (mounted) setSignalrConnected(false);
      }
    };

    connect();
    return () => {
      mounted = false;
    };
  }, [fetchOverview]);

  // Scroll log container to top when new live entry arrives
  useEffect(() => {
    if (liveLogs.length > 0) {
      logContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [liveLogs]);

  const allLogs: Array<LiveLogEntry | (LogEntry & { isLive: false })> = [
    ...liveLogs,
    ...dbLogs.map((l) => ({ ...l, isLive: false as const })),
  ];

  const occupancyPct = overview?.occupancyPercentage ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold">Painel Admin</h1>
              <p className="text-xs text-zinc-500">{overview?.parkingLotName ?? 'Carregando...'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* SignalR status */}
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border ${
              signalrConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-500'
            }`}>
              {signalrConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {signalrConnected ? 'Tempo Real' : 'Desconectado'}
            </div>

            {/* Last refresh */}
            <div className="text-xs text-zinc-600 hidden sm:flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {lastRefresh.toLocaleTimeString('pt-BR')}
            </div>

            <button
              onClick={() => { fetchOverview(); fetchLogs(); }}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── KPI Strip ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={<Car className="w-5 h-5" />}
            label="Vagas Ocupadas"
            value={loadingOverview ? '—' : `${overview?.occupiedSpots ?? 0} / ${overview?.totalSpots ?? 0}`}
            sub={`${occupancyPct.toFixed(1)}% de ocupação`}
            color="bg-amber-500/15 text-amber-400"
          />
          <KpiCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Faturamento Hoje"
            value={loadingOverview ? '—' : `R$ ${fmt(overview?.revenueTodayTotal ?? 0)}`}
            sub={`${overview?.sessionsTodayCount ?? 0} sessões · ticket médio R$ ${fmt(overview?.averageTicketToday ?? 0)}`}
            color="bg-emerald-500/15 text-emerald-400"
          />
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Média Diária"
            value={loadingOverview ? '—' : `R$ ${fmt(overview?.dailyAverageRevenue ?? 0)}`}
            sub={`Baseado em ${overview?.daysElapsedInMonth ?? 0} dias do mês`}
            color="bg-blue-500/15 text-blue-400"
          />
          <KpiCard
            icon={<CalendarDays className="w-5 h-5" />}
            label="Estimativa Mensal"
            value={loadingOverview ? '—' : `R$ ${fmt(overview?.monthlyRevenueEstimate ?? 0)}`}
            sub={`R$ ${fmt(overview?.monthlyRevenueSoFar ?? 0)} acumulado até hoje`}
            color="bg-purple-500/15 text-purple-400"
          />
        </div>

        {/* ── Occupancy Bar ──────────────────────────────────────────────────── */}
        {overview && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-zinc-300">Ocupação Atual</p>
              <p className="text-sm text-zinc-500">
                <span className="text-white font-medium">{overview.occupiedSpots}</span> ocupadas ·{' '}
                <span className="text-emerald-400 font-medium">{overview.freeSpots}</span> livres
              </p>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${occupancyPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  occupancyPct >= 90 ? 'bg-red-500' :
                  occupancyPct >= 70 ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-zinc-600">
              <span>0%</span>
              <span className={`font-medium ${
                occupancyPct >= 90 ? 'text-red-400' :
                occupancyPct >= 70 ? 'text-amber-400' :
                'text-emerald-400'
              }`}>{occupancyPct.toFixed(1)}%</span>
              <span>100%</span>
            </div>
          </motion.div>
        )}

        {/* ── Bottom Grid: Top Spots + Live Log ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Top 5 Vagas */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-300">Vagas Mais Disputadas</h2>
              <span className="ml-auto text-xs text-zinc-600">últimos 30 dias</span>
            </div>

            {loadingOverview ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (overview?.topSpots?.length ?? 0) === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-8">Nenhum dado ainda.</p>
            ) : (
              <div className="space-y-2">
                {overview!.topSpots.map((spot, idx) => (
                  <div key={spot.spotNumber} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                      idx === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                      idx === 2 ? 'bg-orange-700/20 text-orange-400' :
                      'bg-zinc-700/40 text-zinc-500'
                    }`}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono font-medium text-white">{spot.spotNumber}</p>
                      <p className="text-xs text-zinc-500">{spot.averageDurationMinutes.toFixed(0)} min médio</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-zinc-400">
                        <Hash className="w-3 h-3 inline mr-0.5" />{spot.useCount}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        spot.currentStatus === 'Ocupada'
                          ? 'bg-amber-500/15 text-amber-400'
                          : spot.currentStatus === 'Manutenção'
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}>{spot.currentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Live Log Feed */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              <Activity className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-zinc-300">Log de Atividade</h2>
              {signalrConnected && (
                <span className="ml-2 flex items-center gap-1 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ao vivo
                </span>
              )}
              <span className="ml-auto text-xs text-zinc-600">{allLogs.length} eventos</span>
            </div>

            <div ref={logContainerRef} className="flex-1 overflow-y-auto max-h-80 space-y-1 pr-1">
              <AnimatePresence initial={false}>
                {loadingLogs && allLogs.length === 0 ? (
                  <div className="space-y-2">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : allLogs.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-8">Nenhum evento registrado.</p>
                ) : (
                  allLogs.map((log) => {
                    const isLive = (log as LiveLogEntry).isLive;
                    const occurredAt = 'occurredAt' in log
                      ? typeof log.occurredAt === 'string'
                        ? log.occurredAt
                        : (log.occurredAt as Date).toISOString()
                      : '';
                    return (
                      <motion.div
                        key={log.id}
                        initial={isLive ? { opacity: 0, x: -8, backgroundColor: 'rgba(59,130,246,0.15)' } : false}
                        animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }}
                        transition={{ duration: isLive ? 0.4 : 0 }}
                        className={`flex items-start gap-2.5 px-3 py-2 rounded-lg ${
                          isLive ? 'bg-blue-500/5 border border-blue-500/10' : 'hover:bg-zinc-800/60'
                        }`}
                      >
                        <span className={`mt-0.5 flex-shrink-0 ${eventColor(log.event)}`}>
                          {eventIcon(log.event)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-mono font-medium ${eventColor(log.event)}`}>
                              {log.event}
                            </span>
                            {isLive && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">novo</span>
                            )}
                          </div>
                          {log.description && (
                            <p className="text-xs text-zinc-400 truncate">{log.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-zinc-600 flex-shrink-0 font-mono">
                          {fmtTime(occurredAt)}
                        </span>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ── Financial Detail ──────────────────────────────────────────────── */}
        {overview && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-300">Detalhes Financeiros</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-2">Receita Hoje</p>
                <p className="text-xl font-bold text-emerald-400">R$ {fmt(overview.revenueTodayTotal)}</p>
                <p className="text-xs text-zinc-600 mt-1">{overview.sessionsTodayCount} sessões</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-2">Ticket Médio</p>
                <p className="text-xl font-bold text-amber-400">R$ {fmt(overview.averageTicketToday)}</p>
                <p className="text-xs text-zinc-600 mt-1">por sessão hoje</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-2">Mês Atual</p>
                <p className="text-xl font-bold text-blue-400">R$ {fmt(overview.monthlyRevenueSoFar)}</p>
                <p className="text-xs text-zinc-600 mt-1">dia {overview.daysElapsedInMonth} de {overview.daysInMonth}</p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-2">Projeção Mensal</p>
                <p className="text-xl font-bold text-purple-400">R$ {fmt(overview.monthlyRevenueEstimate)}</p>
                <p className="text-xs text-zinc-600 mt-1">média R$ {fmt(overview.dailyAverageRevenue)}/dia</p>
              </div>
            </div>

            {/* Monthly progress bar */}
            <div className="mt-5">
              <div className="flex justify-between text-xs text-zinc-600 mb-1.5">
                <span>Progresso do mês ({overview.daysElapsedInMonth}/{overview.daysInMonth} dias)</span>
                <span>{((overview.daysElapsedInMonth / overview.daysInMonth) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(overview.daysElapsedInMonth / overview.daysInMonth) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  className="h-full bg-purple-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
