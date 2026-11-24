import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "נקי-לי",
    short_name: "נקי-לי",
    description: "ניהול מטלות שבועיות לבית",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f2",
    theme_color: "#2f7761",
    dir: "rtl",
    lang: "he",
    icons: [
      { src: "/icon.svg", sizes: "48x48", type: "image/svg+xml" },
    ],
  };
}
