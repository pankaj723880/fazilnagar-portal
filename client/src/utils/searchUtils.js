import { useState, useEffect } from "react";

// Common Hindi/Devanagari to English civic keyword mapping
const HINDI_KEYWORD_MAP = {
  "अस्पताल": "hospital",
  "हॉस्पिटल": "hospital",
  "दवा": "pharmacy",
  "मेडिकल": "medical",
  "क्लिनिक": "clinic",
  "डॉक्टर": "doctor",
  "स्कूल": "school",
  "विद्यालय": "school",
  "कॉलेज": "college",
  "शिक्षा": "education",
  "थाना": "police",
  "पुलिस": "police",
  "बैंक": "bank",
  "एटीएम": "atm",
  "पेट्रोल": "petrol",
  "डीजल": "fuel",
  "पंप": "pump",
  "बाजार": "market",
  "मंडी": "mandi",
  "दुकान": "shop",
  "होटल": "hotel",
  "मिठाई": "sweet",
  "फाजिलनगर": "fazilnagar",
  "पावानगर": "pawanagar",
};

/**
 * Sanitizes search input by trimming, stripping control characters, and capping length at 100.
 */
export function sanitizeSearchQuery(query) {
  if (typeof query !== "string") return "";
  return query
    .slice(0, 100)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .trim();
}

/**
 * Generates search keywords including Devanagari mappings and lower-cased tokens.
 */
export function getSearchKeywords(query) {
  const clean = sanitizeSearchQuery(query).toLowerCase();
  if (!clean) return [];

  const keywords = new Set([clean]);

  // Add individual words
  clean.split(/\s+/).forEach((w) => {
    if (w.length > 1) keywords.add(w);
  });

  // Check Hindi mappings
  for (const [hi, en] of Object.entries(HINDI_KEYWORD_MAP)) {
    if (clean.includes(hi)) {
      keywords.add(en);
    }
  }

  return Array.from(keywords);
}

/**
 * Matches target searchable text against query keywords.
 */
export function matchesSearchText(targetText, query) {
  if (!query) return true;
  const keywords = getSearchKeywords(query);
  if (keywords.length === 0) return true;

  const haystack = (targetText || "").toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

/**
 * Hook to debounce search input values (e.g. 200ms)
 */
export function useDebouncedSearch(value, delay = 200) {
  const [debounced, setDebounced] = useState(() => sanitizeSearchQuery(value));

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounced(sanitizeSearchQuery(value));
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}
