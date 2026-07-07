import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Predict — on-chain prediction markets",
  description: "Binary YES/NO prediction markets settled fully on-chain. Buy shares, then redeem winners 1:1.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-bg font-sans text-text antialiased">
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 sm:px-5">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
