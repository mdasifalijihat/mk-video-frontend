import type { Metadata } from 'next';
import './globals.css';
import './video.css';

export const metadata: Metadata = {
  title: 'MK Video',
  description: 'Explore and watch published videos from MK Video.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
