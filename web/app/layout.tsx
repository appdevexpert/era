import type { Metadata } from "next";
import localFont from "next/font/local";

import { ShellOrBare } from "@/components/admin/shell-or-bare";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider, Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentAdminUser().catch(() => null);
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfairDisplay.variable} ${italiana.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <TooltipProvider>
              <ShellOrBare user={user}>{children}</ShellOrBare>
            </TooltipProvider>
            <Toaster />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
