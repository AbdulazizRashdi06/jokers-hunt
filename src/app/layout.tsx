import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: "The Joker's Hunt | GUvoices × German Festival",
  description: "Every card holds a clue. A campus-wide treasure hunt from GUtech's Debate Club, 8 December 2026.",
  openGraph: { title: "The Joker's Hunt", description: "Every card holds a clue. GUvoices × German Festival." }
};
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
