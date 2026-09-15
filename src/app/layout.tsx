import type { Metadata, Viewport } from 'next';
import './globals.css';
import './phase8.css';
import './stitch-history.css';
import './stitch-home.css';
import { Toaster } from '@/components/ui/toaster';
import data from '@/lib/placeholder-images.json';

export const metadata: Metadata = {
  title: 'PulsyVibe | AI Powered Mood Curations',
  description: 'Sync your mood with the perfect playlist instantly.',
  creator: 'NashFire',
  publisher: 'NashFire',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'PulsyVibe' },
  formatDetection: { telephone: false },
  openGraph: { title: 'PulsyVibe', description: 'Sync your mood with the perfect playlist.', type: 'website', siteName: 'PulsyVibe' },
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#171719',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const appleIcon = data.placeholderImages.find(img => img.id === 'app-icon-512')?.imageUrl || 'https://picsum.photos/seed/pulsyvibe-pro-hq-512/512/512';
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/settings.css" />
        <link rel="apple-touch-icon" href={appleIcon} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="author" content="NashFire" />
        <meta name="theme-color" content="#171719" id="system-theme-color" />
        <script dangerouslySetInnerHTML={{ __html: `if (typeof window !== 'undefined') { document.documentElement.removeAttribute('data-theme'); }` }} />
        <script dangerouslySetInnerHTML={{ __html: `if (typeof window !== 'undefined') { document.addEventListener('contextmenu', (e) => e.preventDefault()); document.onkeydown = (e) => { if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || (e.ctrlKey && e.keyCode === 85)) { e.preventDefault(); return false; } }; }` }} />
      </head>
      <body className="font-sans antialiased selection:bg-primary/20 selection:text-primary pb-[safe-area-inset-bottom]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
