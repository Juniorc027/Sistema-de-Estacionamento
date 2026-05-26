'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, BarChart3, DollarSign, TrendingUp, History } from 'lucide-react';
import { ReportCard } from '@/components/relatorios/ReportCard';
import { HistoricoModal } from '@/components/relatorios/HistoricoModal';
import { TimelineModal } from '@/components/relatorios/TimelineModal';
import { FaturamentoModal } from '@/components/relatorios/FaturamentoModal';
import { ComparacaoModal } from '@/components/relatorios/ComparacaoModal';
import { SessoesModal } from '@/components/relatorios/SessoesModal';

type ModalId = 'historico' | 'timeline' | 'faturamento' | 'comparacao' | 'sessoes' | null;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function RelatoriosPage() {
  const router = useRouter();
  const [openModal, setOpenModal] = useState<ModalId>(null);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Voltar ao Dashboard</span>
          </button>
          <div className="h-5 w-px bg-zinc-700" />
          <div>
            <h1 className="text-lg font-bold text-white">Relatórios e Análises</h1>
            <p className="text-xs text-zinc-400">Estacionamento Central</p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Central de Relatórios</h2>
          <p className="text-zinc-400 text-sm">Selecione um relatório para visualizar e exportar os dados do estacionamento.</p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <motion.div variants={cardVariants}>
            <ReportCard
              icon={<History className="w-6 h-6" />}
              title="Histórico de Ocupação"
              description="Registro completo de entradas e saídas com placa, data, hora e valor cobrado por sessão."
              color="emerald"
              onClick={() => setOpenModal('historico')}
            />
          </motion.div>

          <motion.div variants={cardVariants}>
            <ReportCard
              icon={<Clock className="w-6 h-6" />}
              title="Data e Hora de Ocupação"
              description="Distribuição da ocupação por hora do dia — identifique os horários de maior e menor movimento."
              color="blue"
              onClick={() => setOpenModal('timeline')}
            />
          </motion.div>

          <motion.div variants={cardVariants}>
            <ReportCard
              icon={<DollarSign className="w-6 h-6" />}
              title="Faturamento"
              description="Receita total, ticket médio e breakdown por dia e por vaga. Tarifa calculada em R$ 5,00/min."
              color="amber"
              onClick={() => setOpenModal('faturamento')}
            />
          </motion.div>

          <motion.div variants={cardVariants}>
            <ReportCard
              icon={<TrendingUp className="w-6 h-6" />}
              title="Vagas Mais Disputadas"
              description="Comparativo de utilização entre vagas: top 5, bottom 5, média geral e desvio padrão."
              color="violet"
              onClick={() => setOpenModal('comparacao')}
            />
          </motion.div>

          <motion.div variants={cardVariants}>
            <ReportCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Sessões Detalhadas"
              description="Estatísticas de duração: tempo médio, mínimo, máximo e volume por dia, semana e mês."
              color="rose"
              onClick={() => setOpenModal('sessoes')}
            />
          </motion.div>
        </motion.div>

        {/* Rodapé informativo */}
        <div className="mt-12 p-5 rounded-xl bg-zinc-800/40 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Todos os relatórios suportam exportação em <span className="text-emerald-400">CSV</span> e <span className="text-blue-400">PDF</span>.
            Os dados são consultados em tempo real a partir do banco de dados do sistema.
            Utilize os filtros de data em cada modal para ajustar o período de análise.
          </p>
        </div>
      </div>

      {/* Modais */}
      <HistoricoModal open={openModal === 'historico'} onClose={() => setOpenModal(null)} />
      <TimelineModal open={openModal === 'timeline'} onClose={() => setOpenModal(null)} />
      <FaturamentoModal open={openModal === 'faturamento'} onClose={() => setOpenModal(null)} />
      <ComparacaoModal open={openModal === 'comparacao'} onClose={() => setOpenModal(null)} />
      <SessoesModal open={openModal === 'sessoes'} onClose={() => setOpenModal(null)} />
    </div>
  );
}
