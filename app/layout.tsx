import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { getSession } from "@/lib/auth";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "StagePass — Ticket booking",
  description: "Reserve seats for films and live events with live holds, QR tickets, and waitlists.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSession();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <Header user={user} />
        <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10">{children}</main>
        <Footer />
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  );
}
