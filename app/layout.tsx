"use client";
import { Nunito, Nunito_Sans } from "next/font/google";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Verch - VSU Merch Platform for Student Organizations</title>
        <meta
          name="description"
          content="Your e-commerce platform for Visayas State University student organization merchandise"
        />
        <link rel="icon" href="/enhanced-logo-final.svg" />
        <link rel="apple-touch-icon" href="/images/enhanced-logo-final.png" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body
        className={`${nunito.variable} ${nunitoSans.variable} antialiased`}
        suppressHydrationWarning
      >
        <div suppressHydrationWarning style={{ display: "contents" }}>
          <SidebarProvider>{children}</SidebarProvider>
          <Toaster position="top-right" expand={false} richColors closeButton />
        </div>
      </body>
    </html>
  );
}
