import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Tipografía de marca (Tarea 3.5.b, `docs/brand-guide.md` sección 4). La
// variable la consume `--font-sans` en `app/globals.css`, así que todas las
// utilidades de Tailwind (`font-sans`, y el default del `body`) la heredan.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aztec — Gestión de proyectos",
  description:
    "Sistema de gestión de proyectos y tareas: bloqueos, siguiente paso y priorización automática.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
