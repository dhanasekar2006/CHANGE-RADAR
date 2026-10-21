const loaded = new Set<string>();

/** Adds a stylesheet link once. Used so legacy pages pull in their own fonts only when they are opened. */
export function loadFonts(href: string): void {
  if (loaded.has(href) || typeof document === "undefined") return;
  loaded.add(href);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

const GOOGLE = "https://fonts.googleapis.com/css2";

/** Storefront (/): Montserrat body and Caveat Brush headings. */
export const STOREFRONT_FONTS = `${GOOGLE}?family=Caveat+Brush&family=Montserrat:wght@400;500;600;700&display=swap`;

/** Project overview (/project): Rajdhani headings and Poppins body. */
export const PROJECT_FONTS = `${GOOGLE}?family=Poppins:wght@400;500;600&family=Rajdhani:wght@600;700&display=swap`;

/** Sign-in screen (/login): Sora. */
export const LOGIN_FONTS = `${GOOGLE}?family=Sora:wght@400;500;600;700&display=swap`;
