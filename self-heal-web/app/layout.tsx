import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Self-Heal Runtime Dashboard",
  description: "Autonomous Code-Triage for Java - Monitor and fix runtime errors automatically",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
