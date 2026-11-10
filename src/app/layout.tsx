import type { Metadata, Viewport } from 'next';
import './globals.css';
import './hunt.css';
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover', interactiveWidget: 'resizes-content'
};
export const metadata: Metadata = {
  title: "The Joker's Hunt",
  description: "Can you outsmart the Joker? Follow the clues. Collect the cards.",
  openGraph: { title: "The Joker's Hunt", description: "Can you outsmart the Joker?" }
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
