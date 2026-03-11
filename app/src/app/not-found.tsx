/**
 * Página 404 - Not Found
 */
'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl text-gray-400 mb-8">Página não encontrada</h2>
        <Link
          href="/"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Voltar ao Estacionamento
        </Link>
      </div>
    </div>
  );
}
