import type { Metadata } from "next";
import { Suspense } from "react";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackClientApp } from "../stack/client";
import "./globals.css";

export const metadata: Metadata = {
  title: "bizwin.lol - Learn Entrepreneurship by Running a Real Business",
  description: "The store is the classroom. Build a real dropshipping business powered by CJ Dropshipping while AI coaches every decision you make.",
  icons: {
    icon: '/roboticon.jpg',
    shortcut: '/roboticon.jpg',
    apple: '/roboticon.jpg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <StackProvider app={stackClientApp}>
          <StackTheme>
            <Suspense>
              {children}
            </Suspense>
          </StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
