/** Shopping lists are stored in a chore's description, one product per line. */
export const MAX_SHOPPING_ITEMS = 30;
export const MAX_ITEM_LENGTH = 50;

export function parseShoppingItems(description: string): string[] {
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_SHOPPING_ITEMS);
}

export function serializeShoppingItems(items: string[]): string {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_SHOPPING_ITEMS)
    .join("\n");
}
