import type { Metadata, Viewport } from "next";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://verch.jsos.site"),
  title: "Verch | The Central Store for Organization Merchandises",
  description: "Discover the best merchandises on Verch.",
  icons: {
    icon: [{ url: "/logo-verch.webp", type: "image/webp" }],
    shortcut: "/logo-verch.webp",
    apple: { url: "/logo-verch.webp", type: "image/webp" },
  },
  openGraph: {
    title: "Verch | The Central Store for Organization Merchandises",
    description: "Discover the best merchandises on Verch.",
    url: "https://verch.jsos.site/",
    siteName: "Verch",
    images: [
      {
        url: "https://verch.jsos.site/display2.png?v=1",
        width: 1200,
        height: 630,
        alt: "Verch - Organization Merchandises",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Verch | Official Website for VSU Student Org Merchandises",
    description: "Discover the best merchandises on Verch.",
    images: ["https://verch.jsos.site/display.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a4d2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${nunitoSans.variable} antialiased`}
        suppressHydrationWarning
      >
        <div suppressHydrationWarning style={{ display: "contents" }}>
          <SidebarProvider>{children}</SidebarProvider>
          <Toaster
            position="bottom-right"
            expand={false}
            richColors
            closeButton
          />
        </div>
      </body>
    </html>
  );
}
