import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/site/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CampusKart — College Marketplace & Writing Hub",
  description:
    "Buy, sell, and collaborate with students on your campus. Marketplace for books, electronics & more, plus a Writing Hub for student writers.",
  keywords: ["CampusKart", "college marketplace", "student marketplace", "writing hub", "India colleges"],
  authors: [{ name: "CampusKart" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "CampusKart — College Marketplace & Writing Hub",
    description: "Buy, sell, and collaborate with students on your campus.",
    siteName: "CampusKart",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
