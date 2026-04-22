import { gsap } from 'gsap';

// ── Fade in element ───────────────────────────────────────────────────────────
export const fadeIn = (el, delay = 0) =>
  gsap.fromTo(el,
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: 0.22, ease: 'power2.out', delay }
  );

// ── Stagger a list of elements ────────────────────────────────────────────────
export const staggerIn = (els, stagger = 0.05) =>
  gsap.fromTo(els,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', stagger }
  );

// ── Card drop animation (after drag) ─────────────────────────────────────────
export const cardDrop = (el) =>
  gsap.fromTo(el,
    { scale: 0.96, opacity: 0.7 },
    { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(1.4)' }
  );

// ── Slide in from side ────────────────────────────────────────────────────────
export const slideInRight = (el) =>
  gsap.fromTo(el,
    { opacity: 0, x: 24 },
    { opacity: 1, x: 0, duration: 0.25, ease: 'power2.out' }
  );

// ── Modal entrance ────────────────────────────────────────────────────────────
export const modalIn = (el) =>
  gsap.fromTo(el,
    { opacity: 0, scale: 0.96, y: 12 },
    { opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power2.out' }
  );

// ── Pulse a badge (status change feedback) ────────────────────────────────────
export const pulseBadge = (el) =>
  gsap.fromTo(el,
    { scale: 1.15 },
    { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' }
  );
