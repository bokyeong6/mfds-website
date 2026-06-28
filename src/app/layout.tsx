import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AppLayoutWrapper from "../components/Layout/AppLayoutWrapper";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "대한민국 생약자원 표본관(KHR) 표본 관리 웹 서비스",
  description: "대한민국 생약자원 표본관(KHR) 생약 표본 및 공정서 규격 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${outfit.variable} font-sans antialiased bg-slate-950 text-slate-100`}
      >
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}
