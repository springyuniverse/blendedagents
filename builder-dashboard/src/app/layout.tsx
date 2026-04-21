import './globals.css';
import { DM_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Providers } from '@/components/Providers';
import type { Metadata } from 'next';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'BlendedAgents',
  description: 'BlendedAgents — Human-as-a-Tool platform for AI agents. Manage tests, view results, and track credits.',
  icons: { icon: '/favicon.svg' },
  other: { 'theme-color': '#faf9fb' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${ibmPlexMono.variable}`}>
      <body className="bg-bg text-text-primary antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
