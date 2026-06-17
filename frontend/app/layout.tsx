import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/Theme/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chaty",
  description: "Real-time chat application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of wrong theme: set data-theme BEFORE first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('chaty-theme');
                  if (theme === 'light' || theme === 'dark' || theme === 'midnight') {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="data-theme"
          themes={["light", "dark", "midnight"]}
          defaultTheme="system"
          enableSystem
          storageKey="chaty-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
