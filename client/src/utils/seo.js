import { useEffect } from "react";

export const SITE_NAME = "Fazilnagar Town Portal";
export const BASE_URL = "https://www.fazilnagar.me";
export const DEFAULT_OG_IMAGE = "https://www.fazilnagar.me/og-image.jpg";

/**
 * Custom Hook for dynamic route-specific SEO metadata:
 * - document.title
 * - meta[name="description"]
 * - meta[name="robots"]
 * - link[rel="canonical"]
 * - Open Graph tags (og:title, og:description, og:url, og:image, og:site_name, og:type, og:locale)
 * - Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
 */
export function usePageSEO({
  title,
  description,
  canonicalPath = "/",
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
}) {
  useEffect(() => {
    // 1. Title formatting
    const fullTitle = title.includes("Fazilnagar")
      ? title
      : `${title} | Fazilnagar Town Portal`;
    document.title = fullTitle;

    // Helper: set or update meta tag
    const setMeta = (attr, name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // 2. Standard Description & Robots
    if (description) {
      setMeta("name", "description", description);
    }
    setMeta(
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
    );

    // 3. Canonical Link
    const cleanPath = canonicalPath.startsWith("/") ? canonicalPath : `/${canonicalPath}`;
    const canonicalUrl = `${BASE_URL}${cleanPath === "/" ? "" : cleanPath}`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl || `${BASE_URL}/`);

    // 4. Open Graph Tags
    setMeta("property", "og:title", fullTitle);
    if (description) setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonicalUrl || `${BASE_URL}/`);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:locale", "en_IN");
    setMeta("property", "og:image", ogImage);

    // 5. Twitter Card Tags
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    if (description) setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);
  }, [title, description, canonicalPath, ogType, ogImage, noIndex]);
}
