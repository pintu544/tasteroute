import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TasteRoute — plans with taste',
  description:
    'An agentic outing planner powered by Qloo taste intelligence. Your music taste picks your restaurant.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
