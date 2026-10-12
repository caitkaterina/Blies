import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'BLIES | Procurement & Logistics', description: 'Explore procurement, logistics and fleet support with BLIES.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
