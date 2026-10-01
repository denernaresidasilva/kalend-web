import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Kalend", short_name: "Kalend", lang: "pt-BR",
    description: "Gestão inteligente Kalend", start_url: "/conta", scope: "/",
    display: "standalone", theme_color: "#6558f5", background_color: "#ffffff",
    icons: [192, 512].map(size => ({ src: `/icons/kalend-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" })),
  };
}
