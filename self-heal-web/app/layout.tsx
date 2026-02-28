import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-inter",
  weight: "100 900",
});
const mono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Self-Heal Runtime 🛡️🤖",
  description: "Autonomous Code-Triage for Java using AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} font-sans bg-[#020817] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
