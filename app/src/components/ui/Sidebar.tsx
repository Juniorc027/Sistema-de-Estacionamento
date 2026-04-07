'use client';

import { motion } from 'framer-motion';
import { BarChart3, LayoutDashboard, Activity, Shield, History } from 'lucide-react';
import { useState } from 'react';
import { PanelId } from '@/types/parking';

type SidebarProps = {
  activePanel: PanelId | null;
  onSelectPanel: (panelId: PanelId) => void;
};

interface NavItem {
  id: PanelId;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    description: 'Visão Geral em tempo real',
  },
  {
    id: 'occupancy',
    label: 'Gestão de Fluxo',
    icon: <Activity className="w-5 h-5" />,
    description: 'Ocupação e Tempo Médio',
  },
  {
    id: 'ranking',
    label: 'Auditoria de Vagas',
    icon: <Shield className="w-5 h-5" />,
    description: 'Ranking de uso das vagas',
  },
  {
    id: 'history',
    label: 'Log de Eventos',
    icon: <History className="w-5 h-5" />,
    description: 'Histórico bruto de eventos',
  },
];

export function Sidebar({ activePanel, onSelectPanel }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        {/* Logo/Brand */}
        <div className="h-12 flex items-center gap-3 px-2 rounded-lg text-white">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          {isExpanded && <span className="font-semibold tracking-wide whitespace-nowrap">Estacionamento</span>}
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onSelectPanel(item.id)}
              className={`w-full h-11 rounded-lg flex items-center gap-3 px-2 transition-all duration-200 font-medium ${
                activePanel === item.id
                  ? 'bg-gradient-to-r from-emerald-500/30 to-emerald-500/10 text-emerald-300 border border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                  : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white border border-transparent hover:border-zinc-700'
              }`}
              title={item.description}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {isExpanded && <span className="text-sm whitespace-nowrap text-left">{item.label}</span>}
            </motion.button>
          ))}
        </nav>

        {/* Footer Info */}
        {isExpanded && activePanel && (
          <div className="mt-auto pt-4 px-2 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 mb-1">
              Ativo
            </p>
            <p className="text-xs text-emerald-400">
              {navItems.find(item => item.id === activePanel)?.label}
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
