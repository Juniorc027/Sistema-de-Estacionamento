'use client';

import { motion } from 'framer-motion';
import { LayoutDashboard, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

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
          {isExpanded && (
            <span className="font-semibold tracking-wide whitespace-nowrap">Estacionamento</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex-1 flex flex-col gap-2">
          <motion.button
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => router.push('/relatorios')}
            className="w-full h-11 rounded-lg flex items-center gap-3 px-2 transition-all duration-200 font-medium text-zinc-300 hover:bg-zinc-800/80 hover:text-white border border-transparent hover:border-zinc-700"
            title="Relatórios e Análises"
          >
            <div className="flex-shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            {isExpanded && (
              <span className="text-sm whitespace-nowrap text-left">Relatórios</span>
            )}
          </motion.button>
        </nav>
      </div>
    </motion.aside>
  );
}
