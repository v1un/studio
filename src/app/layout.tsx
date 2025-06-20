
import type {Metadata, Viewport} from 'next';
import { Inter } from 'next/font/google';
import { Literata } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ui/theme-provider";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const literata = Literata({
  subsets: ['latin'],
  variable: '--font-literata',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Story Forge',
  description: 'Craft your own adventures with Story Forge, an AI-powered storytelling game.',
  keywords: ['storytelling', 'AI', 'game', 'interactive fiction', 'RPG'],
  authors: [{ name: 'Story Forge Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#8B5CF6' },
    { media: '(prefers-color-scheme: dark)', color: '#8B5CF6' }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${literata.variable}`} suppressHydrationWarning>
      <body className="font-body antialiased h-full bg-background text-foreground overflow-x-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange={false}
        >
          <div className="relative min-h-full bg-gradient-to-br from-background via-background-secondary to-background-tertiary">
            {children}
            <Toaster />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
