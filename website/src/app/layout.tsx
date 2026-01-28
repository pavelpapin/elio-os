import type { Metadata } from "next";
import localFont from "next/font/local";
import { Jost } from "next/font/google";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["800"],
  variable: "--font-logo",
});

export const metadata: Metadata = {
  title: "elio. — turn WhatsApp chats into closed deals",
  description:
    "Turn WhatsApp conversations with buyers and investors into closed contracts. Full owner-level visibility over deal flow and agent performance.",
  metadataBase: new URL("https://getelio.co"),
  openGraph: {
    title: "elio. — turn WhatsApp chats into closed deals",
    description:
      "Turn WhatsApp conversations with buyers and investors into closed contracts. Full owner-level visibility over deal flow and agent performance.",
    url: "https://getelio.co",
    siteName: "elio.",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "elio. — turn WhatsApp chats into closed deals",
    description:
      "Turn WhatsApp conversations with buyers and investors into closed contracts.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${jost.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
