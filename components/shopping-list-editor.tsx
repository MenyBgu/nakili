"use client";

import { Plus, ShoppingBasket, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { MAX_ITEM_LENGTH, MAX_SHOPPING_ITEMS } from "@/lib/shopping";

/** A numbered list editor: one product per row, numbered 1..N. */
export function ShoppingListEditor({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const pendingFocus = useRef<number | null>(null);

  useEffect(() => {
    if (pendingFocus.current === null) return;
    inputs.current[pendingFocus.current]?.focus();
    pendingFocus.current = null;
  });

  const filled = items.filter((item) => item.trim()).length;
  const canAdd = items.length < MAX_SHOPPING_ITEMS;

  const setItem = (index: number, value: string) =>
    onChange(items.map((item, position) => (position === index ? value : item)));

  const insertAfter = (index: number, values: string[] = [""]) => {
    const next = [...items.slice(0, index + 1), ...values, ...items.slice(index + 1)].slice(0, MAX_SHOPPING_ITEMS);
    pendingFocus.current = Math.min(index + values.length, next.length - 1);
    onChange(next);
  };

  const remove = (index: number) => {
    const next = items.filter((_, position) => position !== index);
    pendingFocus.current = Math.max(0, index - 1);
    onChange(next.length ? next : [""]);
  };

  return (
    <section className="shopping-editor" aria-label="רשימת קניות">
      <header className="shopping-head">
        <ShoppingBasket size={17} aria-hidden="true" />
        <strong>רשימת קניות</strong>
        <span className="shopping-count">{filled === 0 ? "ריקה" : filled === 1 ? "מוצר אחד" : `${filled} מוצרים`}</span>
      </header>
      <ol className="shopping-rows">
        {items.map((item, index) => (
          <li key={index} className="shopping-row">
            <span className="shopping-num" aria-hidden="true">{index + 1}</span>
            <input
              ref={(element) => {
                inputs.current[index] = element;
              }}
              aria-label={`מוצר ${index + 1}`}
              value={item}
              maxLength={MAX_ITEM_LENGTH}
              placeholder={index === 0 ? "למשל: חלב" : "מוצר נוסף"}
              enterKeyHint="next"
              onChange={(event) => setItem(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (canAdd && item.trim()) insertAfter(index);
                } else if (event.key === "Backspace" && !item && items.length > 1) {
                  event.preventDefault();
                  remove(index);
                }
              }}
              onPaste={(event) => {
                const text = event.clipboardData.getData("text");
                if (!/\r?\n/.test(text)) return;
                event.preventDefault();
                const lines = text
                  .split(/\r?\n/)
                  .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim().slice(0, MAX_ITEM_LENGTH))
                  .filter(Boolean);
                if (!lines.length) return;
                const [first, ...rest] = lines;
                const next = items.map((value, position) => (position === index ? first : value));
                if (rest.length) {
                  const merged = [...next.slice(0, index + 1), ...rest, ...next.slice(index + 1)].slice(0, MAX_SHOPPING_ITEMS);
                  pendingFocus.current = Math.min(index + rest.length, merged.length - 1);
                  onChange(merged);
                } else {
                  onChange(next);
                }
              }}
            />
            {(items.length > 1 || item) && (
              <button
                type="button"
                className="shopping-remove"
                onClick={() => remove(index)}
                aria-label={`הסרת מוצר ${index + 1}`}
              >
                <X size={15} />
              </button>
            )}
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="shopping-add"
        onClick={() => insertAfter(items.length - 1)}
        disabled={!canAdd}
      >
        <Plus size={16} /> הוספת מוצר
      </button>
    </section>
  );
}
