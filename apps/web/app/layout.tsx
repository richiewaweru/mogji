import { color, font } from "@mogji/tokens";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Mogji Circles",
  description: "Find out who really reads the group chat."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={
          {
            "--paper": color.paper,
            "--paper-raised": color.paperRaised,
            "--ink": color.ink,
            "--ink-muted": color.inkMuted,
            "--line": color.line,
            "--butter-from": color.butterFrom,
            "--butter-to": color.butterTo,
            "--amber-ink": color.amberInk,
            "--match": color.match,
            "--alternate": color.alternate,
            "--miss": color.miss,
            "--meta": color.meta,
            "--candy-border": color.candyBorder,
            "--shadow-flat": color.shadowAmberFlat,
            "--shadow-tile": color.shadowAmberTile,
            "--shadow-button": color.shadowAmberButton,
            fontFamily: font.body
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
