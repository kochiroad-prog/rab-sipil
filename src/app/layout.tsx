import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estimator Sipil & Konstruksi",
  description: "Aplikasi bantu hitung RAB untuk pekerjaan sipil & konstruksi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 font-sans">{children}</body>
    </html>
  );
}
