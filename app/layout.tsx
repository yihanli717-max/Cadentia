import "./globals.css";
import type { Metadata } from "next";
import { noto_sans } from "./fonts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Synthia",
  description: "An Intelligent User Interface for Feedback Sensemaking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%2210 0 100 100%22><text y=%22.90em%22 font-size=%2290%22>📑</text></svg>"
        />
      </head>
      <body
        data-theme="light"
        className={cn(
          noto_sans.className +
            " absolute inset-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]",
        )}
      >
        {children}
      </body>
    </html>
  );
}
