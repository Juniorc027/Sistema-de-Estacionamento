'use client';

import { motion } from 'framer-motion';

interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  metric?: string;
  metricLabel?: string;
  color: 'emerald' | 'blue' | 'violet' | 'amber' | 'rose';
  onClick: () => void;
}

const colorMap = {
  emerald: {
    icon: 'bg-emerald-500/15 text-emerald-400',
    border: 'hover:border-emerald-500/40',
    metric: 'text-emerald-400',
  },
  blue: {
    icon: 'bg-blue-500/15 text-blue-400',
    border: 'hover:border-blue-500/40',
    metric: 'text-blue-400',
  },
  violet: {
    icon: 'bg-violet-500/15 text-violet-400',
    border: 'hover:border-violet-500/40',
    metric: 'text-violet-400',
  },
  amber: {
    icon: 'bg-amber-500/15 text-amber-400',
    border: 'hover:border-amber-500/40',
    metric: 'text-amber-400',
  },
  rose: {
    icon: 'bg-rose-500/15 text-rose-400',
    border: 'hover:border-rose-500/40',
    metric: 'text-rose-400',
  },
};

export function ReportCard({ icon, title, description, metric, metricLabel, color, onClick }: ReportCardProps) {
  const colors = colorMap[color];

  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      type="button"
      className={`w-full text-left p-6 rounded-2xl bg-zinc-800/60 border border-zinc-700 ${colors.border} transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.icon}`}>
          {icon}
        </div>
        {metric && (
          <div className="text-right">
            <p className={`text-2xl font-bold ${colors.metric}`}>{metric}</p>
            {metricLabel && <p className="text-xs text-zinc-500">{metricLabel}</p>}
          </div>
        )}
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
      <div className="mt-4 flex items-center gap-1 text-xs text-zinc-500">
        <span>Clique para abrir</span>
        <span>→</span>
      </div>
    </motion.button>
  );
}
