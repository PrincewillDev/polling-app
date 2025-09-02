import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServerAuthWrapper } from "@/components/auth/server-auth-wrapper";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polling App - Create and Share Polls",
  description:
    "Create engaging polls, gather opinions, and analyze results with our modern polling platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <ServerAuthWrapper>{children}</ServerAuthWrapper>
      </body>
    </html>
  );
}
