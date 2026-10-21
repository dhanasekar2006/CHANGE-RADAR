export type ArtKind =
  | "phone"
  | "headphones"
  | "laptop"
  | "watch"
  | "tv"
  | "camera"
  | "shoe"
  | "speaker"
  | "box";

const KEYWORDS: [ArtKind, RegExp][] = [
  ["headphones", /headphone|earbud|earphone|airpods|buds|headset|neckband/i],
  [
    "phone",
    /phone|iphone|galaxy|pixel|oneplus|redmi|realme|mobile|smartphone/i,
  ],
  ["laptop", /laptop|macbook|notebook|chromebook|thinkpad/i],
  ["watch", /watch|band|fitbit/i],
  ["tv", /\btv\b|television|monitor|oled|qled/i],
  ["camera", /camera|dslr|gopro|lens/i],
  ["shoe", /shoe|sneaker|running|boot|sandal/i],
  ["speaker", /speaker|soundbar|echo|homepod/i],
];

/** Picks an illustration from the product's name and category; falls back to a parcel. */
export function artKind(
  name: string,
  category: string | null | undefined,
): ArtKind {
  const text = `${name} ${category ?? ""}`;
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "box";
}
