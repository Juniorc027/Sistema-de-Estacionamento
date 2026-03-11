import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Parking System - Visualização 3D',
  description: 'Sistema de estacionamento inteligente com visualização em tempo real',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
