import type { Metadata, Viewport } from "next";
import "./globals.css";

const description = "ניקיון, סידורים וארגון לכל בני הבית, בשבוע אחד ברור.";

export const metadata: Metadata = {
  title: "נקי-לי | ניהול משימות לבית",
  description,
  applicationName: "נקי-לי",
  appleWebApp: {
    capable: true,
    title: "נקי-לי",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "נקי-לי — הבית מסודר, בלי לזכור הכול",
    description,
    siteName: "נקי-לי",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "נקי-לי — הבית מסודר, בלי לזכור הכול",
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f7f2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
