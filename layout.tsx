import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorker } from "@/components/service-worker";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["cyrillic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Цветочки — мягкий дневник питания",
  description:
    "Мягкий дневник питания и здоровья: калории, БЖУ, вода, цикл, самочувствие, рецепты и заботливая аналитика с ИИ.",
  applicationName: "Цветочки",
  keywords: [
    "дневник питания",
    "калории",
    "БЖУ",
    "рецепты",
    "женский календарь",
    "вода",
    "ИМТ",
  ],
  authors: [{ name: "Цветочки" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Цветочки",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: [{ url: "/favicon.ico" }],
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  openGraph: {
    title: "Цветочки — мягкий дневник питания",
    description:
      "Дневник питания, здоровья и цикла с заботливым ИИ. Sage green, кремовый, белый.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#9CAF88",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${nunito.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
