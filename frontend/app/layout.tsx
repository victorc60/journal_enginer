import type { Metadata } from "next";
import type { ReactNode } from "react";
import MobileDock from "@/components/MobileDock";
import "./globals.css";

export const metadata: Metadata = {
  title: "Factory AI Journal",
  description: "Mobile-first shift journal for industrial engineering work.",
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        {children}
        <MobileDock />
      </body>
    </html>
  );
}
