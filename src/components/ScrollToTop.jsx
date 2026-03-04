import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new WeakSet();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
          seen.add(entry.target);
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );

    const wireTargets = () => {
      const targets = document.querySelectorAll(".reveal-on-scroll");
      if (!targets.length) return;

      targets.forEach((el) => {
        if (seen.has(el)) return;

        if (reducedMotion) {
          el.classList.add("is-visible");
          seen.add(el);
          return;
        }

        observer.observe(el);
        seen.add(el);
      });
    };

    wireTargets();

    const mo = new MutationObserver(() => wireTargets());
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      mo.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
