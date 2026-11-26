import { AppPromo } from "@/components/app-promo";
import { NakiliLogo } from "@/components/nakili-logo";

export function SiteFooter() {
  return (
    <>
      <AppPromo />
      <footer className="site-footer">
        <NakiliLogo size={18} title="" />
        <p>
          <span>© {new Date().getFullYear()}</span>
          <span className="site-footer-dot" aria-hidden="true">·</span>
          <span>כל הזכויות שמורות למני בוגנים</span>
        </p>
      </footer>
    </>
  );
}
