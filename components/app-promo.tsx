"use client";

import { ArrowUpLeft } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export type PromoApp = {
  id: string;
  name: string;
  title: string;
  description: string;
  /** Small print under the description (disclaimers, access notes). */
  note?: string;
  cta: string;
  href: string;
  logo: string;
  theme: "household" | "stocks";
};

/** Add a new live app by adding one entry here. */
export const PROMO_APPS: PromoApp[] = [
  {
    id: "household-expenses",
    name: "הוצאות הבית",
    title: "לדעת לאן הכסף הולך, בלי טבלאות",
    description: "מעלים תמונה של דף הוצאות, מאשרים קטגוריות, ורואים תמונה חודשית ברורה מול החודש הקודם.",
    cta: "לפתיחה",
    href: "https://household-expenses-indol.vercel.app",
    logo: "/promo/household-expenses.svg",
    theme: "household",
  },
  {
    id: "meny-stocks",
    name: "Meny Stocks",
    title: "מחקר מניות חכם, במקום אחד",
    description: "מסוף אנליטיקה ומחקר השקעות מבוסס AI. סביבה פרטית, כניסה בהזמנה בלבד.",
    note: "למידע בלבד, לא ייעוץ השקעות.",
    cta: "כניסה",
    href: "https://meny-stock-desktop.vercel.app",
    logo: "/promo/meny-stocks.png",
    theme: "stocks",
  },
];

export const PROMO_ROTATE_MS = 7000;

export function AppPromo({ apps = PROMO_APPS }: { apps?: PromoApp[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // A fresh timeout per slide, so choosing a dot restarts the countdown.
  useEffect(() => {
    if (apps.length < 2 || paused || reducedMotion) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % apps.length), PROMO_ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [apps.length, index, paused, reducedMotion]);

  if (apps.length === 0) return null;

  return (
    <aside
      className="promo"
      aria-roledescription="carousel"
      aria-label="עוד אפליקציות מבית מני בוגנים"
      // Pause for mouse hover and keyboard focus only: a tap on a phone also focuses
      // the control, and that must not freeze the rotation for good.
      onPointerEnter={(event) => event.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setPaused(false)}
      onFocus={(event) => event.target.matches(":focus-visible") && setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="promo-eyebrow">עוד אפליקציות מבית מני בוגנים</p>
      <div className="promo-stage" aria-live={paused || reducedMotion ? "polite" : "off"}>
        {apps.map((app, position) => {
          const active = position === index;
          return (
            <a
              key={app.id}
              className={`promo-card ${app.theme}${active ? " active" : ""}`}
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-roledescription="slide"
              aria-label={`${app.name}: ${app.title}`}
              aria-hidden={!active}
              inert={!active}
              data-promo={app.id}
            >
              <span className="promo-logo">
                <Image src={app.logo} alt="" width={56} height={56} unoptimized />
              </span>
              <span className="promo-text">
                <bdi className="promo-name">{app.name}</bdi>
                <strong className="promo-title">{app.title}</strong>
                <span className="promo-desc">{app.description}</span>
                {app.note ? <small className="promo-note">{app.note}</small> : null}
              </span>
              <span className="promo-cta" aria-hidden="true">
                <span className="promo-cta-label">{app.cta}</span>
                <ArrowUpLeft size={16} />
              </span>
            </a>
          );
        })}
      </div>
      {apps.length > 1 ? (
        <div className="promo-dots">
          {apps.map((app, position) => (
            <button
              key={app.id}
              type="button"
              className={position === index ? "active" : ""}
              aria-label={`הצג את ${app.name}`}
              aria-current={position === index}
              onClick={() => setIndex(position)}
            />
          ))}
        </div>
      ) : null}
    </aside>
  );
}
