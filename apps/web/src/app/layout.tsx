import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KS1J",
  description: "Jamaat services, welfare, Khums and learning in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
