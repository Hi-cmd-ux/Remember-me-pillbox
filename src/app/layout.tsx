import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'Smart Pill Box & Medication Management System',
  description: 'IoT-based Smart Pill Box medication adherence platform with ESP32 integration, real-time tracking, and Telegram alerts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="text-slate-100 min-h-screen antialiased selection:bg-cyan-500 selection:text-slate-950">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
