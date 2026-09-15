import type { Metadata, Viewport } from 'next';
import './globals.css';
import './appy-ui.css';
import { Toaster } from '@/components/ui/toaster';
import data from '@/lib/placeholder-images.json';

export const metadata: Metadata = { title:'PulsyVibe | AI Powered Mood Curations', description:'Sync your mood with the perfect playlist instantly.', creator:'NashFire', publisher:'NashFire', manifest:'/manifest.json', appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'PulsyVibe'}, formatDetection:{telephone:false} };
export const viewport: Viewport = { width:'device-width', initialScale:1, maximumScale:1, userScalable:false, viewportFit:'cover', themeColor:'#171719' };
export default function RootLayout({children}:{children:React.ReactNode}) {
  const appleIcon=data.placeholderImages.find(img=>img.id==='app-icon-512')?.imageUrl||'/icon.png';
  return <html lang="en" suppressHydrationWarning><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/><link rel="apple-touch-icon" href={appleIcon}/><meta name="mobile-web-app-capable" content="yes"/><meta name="theme-color" content="#171719"/></head><body className="font-sans antialiased selection:bg-primary/20 selection:text-primary">{children}<Toaster/></body></html>;
}
