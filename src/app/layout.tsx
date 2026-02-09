import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { QueryProvider } from "@/components/providers/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Branddock",
  description:
    "SaaS platform combining brand strategy, validation through research, and content creation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only-focusable fixed top-4 left-4 z-[100] bg-primary text-white px-4 py-2 rounded-md text-sm font-medium focus:not-sr-only"
        >
          Skip to content
        </a>
        <QueryProvider>
          {children}
        </QueryProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
