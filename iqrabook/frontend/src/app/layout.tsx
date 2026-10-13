import type { Metadata } from "next";
import { Amiri, Inter, Merriweather } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IqraBook — اقرأ | AI-Powered 3D Learning",
  description:
    "Interactive 3D book platform with AI voice tutor. Learn Python, Java, ML & HTML with personalized Tanglish teaching.",
  keywords: ["learning", "AI", "3D", "Python", "Java", "ML", "IqraBook"],
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${amiri.variable} ${merriweather.variable}`}>
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="bg-iq-darker text-iq-white min-h-screen antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
