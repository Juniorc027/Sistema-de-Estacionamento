'use client';

import { motion } from 'framer-motion';
import { BarChart3, Clock, History, LayoutDashboard, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';

export type ReportId = 'history' | 'hourly-occupancy' | 'average-duration' | 'spot-ranking';

type SidebarProps = {
  selectedReport: ReportId | null;
  onSelectReport: (reportId: ReportId) => void;
};

type MenuItem = {
  id: ReportId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function Sidebar({ selectedReport, onSelectReport }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const menuItems = useMemo<MenuItem[]>(
    () => [
      { id: 'history', label: 'Histórico Completo', icon: History },
      { id: 'hourly-occupancy', label: 'Ocupação por Hora', icon: BarChart3 },
      { id: 'average-duration', label: 'Tempo Médio de Permanência', icon: Clock },
      { id: 'spot-ranking', label: 'Ranking de Vagas', icon: Trophy }
    ],
    []
  );

  return (
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 280 : 64 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="h-full bg-zinc-900 border-r border-zinc-800 shadow-2xl overflow-hidden"
    >
      <div className="h-full flex flex-col p-3">
        <div className="h-12 flex items-center gap-3 px-2 rounded-lg text-white">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          {isExpanded && <span className="font-semibold tracking-wide whitespace-nowrap">Estacionamento</span>}
        </div>

        <div className="mt-8">
          {isExpanded && (
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">RELATÓRIOS</p>
          )}

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = selectedReport === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectReport(item.id)}
                  className={`w-full h-11 rounded-lg flex items-center gap-3 px-2 transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isExpanded && <span className="text-sm whitespace-nowrap text-left">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </motion.aside>
  );
}
