import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";
import {TooltipProvider} from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "ClassFlow",
  description: "Система управления расписанием",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.className} antialiased`}>
        <TooltipProvider>
          <NuqsAdapter>
            <QueryProvider>
              {children}
            </QueryProvider>
          </NuqsAdapter>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
