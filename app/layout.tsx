import type { Metadata } from "next";
import { Lora, Nunito } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const lora = Lora({ subsets: ["latin"], variable: "--font-lora", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "Escapture",
  description: "Keep evidence of what happened, build a case, and escalate it to university reviewers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lora.variable} ${nunito.variable} antialiased`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
