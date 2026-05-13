import type { Metadata } from "next";
import localFont from "next/font/local";
import { AdminShell } from "@/components/admin/admin-shell";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider, Toaster } from "@/components/ui/toast";
import "./globals.css";

const playfairDisplay = localFont({
  src: "../assets/fonts/PlayfairDisplay.ttf",
  variable: "--font-playfair-display",
  display: "swap",
});

const italiana = localFont({
  src: "../assets/fonts/Italiana-Regular.ttf",
  variable: "--font-italiana",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ERA Admin",
  description: "ERA workout administration dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${italiana.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ToastProvider>
          <TooltipProvider>
            <AdminShell>{children}</AdminShell>
          </TooltipProvider>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  );
}
