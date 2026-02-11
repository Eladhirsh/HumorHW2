import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Humor Admin",
  description: "Admin panel for the Humor platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
