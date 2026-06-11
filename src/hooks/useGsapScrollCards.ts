import { type DependencyList, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const CARD_REVEAL_SELECTOR = [
  "[data-gsap-card]",
  ".auth-assist-card",
  ".auth-role-card",
  ".auth-panel",
  ".ai-assist-card",
  "#cabinet-briefing-upper-ribbon",
  "#intelligence-hub-strip",
  "#executive-briefing-control-ribbon",
  "#executive-summary-panel",
  "#executive-priority-stack > div",
  "#executive-speaking-line-grid > div",
  "#no-country-fallback",
  "#executive-no-country-fallback",
  "#country-profile-loading-state",
  "#country-hero-card",
  "#leadership-and-government-grid > div",
  "#sectors-intelligence-section",
  "#core-sectors-grid > div",
  "#flagship-bilateral-builder",
  "#briefing-action-point",
  "#three-pillars-strategic-grid > article",
  "#advisor-rendering-card",
  "#talking-points-cards-grid > div",
  "#one-pager-memo-metadata-table",
  "#slide-player-card",
  "#comparison-visual-charts-grid > div",
  "#predictive-trends-grid > div",
  "#sovereign-strategic-initiative-proposal",
  "#staff-strategic-signals-monitor",
  "#strategic-signals-top-five-list > article",
  "#staff-strategic-meeting-debrief > *",
  "#bilateral-calendar-module",
  "#session-form-container",
  "#scheduled-meetings-timeline > *",
].join(",");

function getRevealCards() {
  const candidates = gsap.utils.toArray<HTMLElement>(CARD_REVEAL_SELECTOR);
  const uniqueCards = new Set<HTMLElement>();

  candidates.forEach((card) => {
    if (card.closest("[data-gsap-reveal-skip]")) {
      return;
    }

    if (card.dataset.gsapRevealed === "true") {
      return;
    }

    if (card.offsetParent === null && card.getClientRects().length === 0) {
      return;
    }

    uniqueCards.add(card);
  });

  return Array.from(uniqueCards);
}

export function useGsapScrollCards(dependencies: DependencyList = []) {
  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return undefined;
    }

    const context = gsap.context(() => {
      const cards = getRevealCards();

      cards.forEach((card, index) => {
        const revealDelay = Math.min(index % 4, 3) * 0.035;
        const revealAnimation = {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          filter: "blur(0px)",
          duration: 0.78,
          delay: revealDelay,
          ease: "power3.out",
          overwrite: "auto" as const,
          clearProps: "opacity,visibility,transform,filter",
          onComplete: () => {
            card.dataset.gsapRevealed = "true";
          },
        };

        gsap.set(card, {
          autoAlpha: 0,
          y: 24,
          scale: 0.99,
          filter: "blur(4px)",
          transformOrigin: "50% 50%",
        });

        if (card.getBoundingClientRect().top < window.innerHeight * 0.88) {
          gsap.to(card, revealAnimation);
          return;
        }

        gsap.to(card, {
          ...revealAnimation,
          scrollTrigger: {
            trigger: card,
            start: "top 88%",
            once: true,
            invalidateOnRefresh: true,
          },
        });
      });

      ScrollTrigger.refresh();
    });

    return () => {
      context.revert();
    };
  }, dependencies);
}
