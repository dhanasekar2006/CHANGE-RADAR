/** The Product route chunk. App uses the same loader, so a prefetch and the real navigation share one request. */
export const loadProductPage = () => import("@/pages/Product");

/** Spread on a link to a product: starts fetching its page the moment the user shows intent. */
export const prefetchProduct = {
  onMouseEnter: () => void loadProductPage(),
  onFocus: () => void loadProductPage(),
  onTouchStart: () => void loadProductPage(),
};
