'use client';

import { Download, FileText } from 'lucide-react';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5167';
const LOT_ID = process.env.NEXT_PUBLIC_PARKING_LOT_ID || '45fc18f2-bdd8-4b11-b964-f8face1147f0';

type ReportType = 'history' | 'hourly' | 'revenue' | 'comparison' | 'sessions';

interface ExportButtonsProps {
  reportType: ReportType;
  from?: string;
  to?: string;
}

async function downloadFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Falha no download');
  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function ExportButtons({ reportType, from, to }: ExportButtonsProps) {
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const buildUrl = (format: 'csv' | 'pdf') => {
    const params = new URLSearchParams({
      parkingLotId: LOT_ID,
      reportType,
      format,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });
    return `${API_URL}/api/reports/export?${params}`;
  };

  const handleCsv = async () => {
    setLoadingCsv(true);
    try {
      await downloadFile(buildUrl('csv'), `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.csv`);
    } catch {
      alert('Erro ao exportar CSV. Verifique a conexão com o servidor.');
    } finally {
      setLoadingCsv(false);
    }
  };

  const handlePdf = async () => {
    setLoadingPdf(true);
    try {
      await downloadFile(buildUrl('pdf'), `relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch {
      alert('Erro ao exportar PDF. Verifique a conexão com o servidor.');
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCsv}
        disabled={loadingCsv}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-all disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {loadingCsv ? 'Exportando...' : 'CSV'}
      </button>
      <button
        onClick={handlePdf}
        disabled={loadingPdf}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 hover:text-blue-300 text-sm font-medium transition-all disabled:opacity-50"
      >
        <FileText className="w-4 h-4" />
        {loadingPdf ? 'Exportando...' : 'PDF'}
      </button>
    </div>
  );
}
