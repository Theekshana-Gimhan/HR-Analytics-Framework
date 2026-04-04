# Visual QA Checklist — Simpala HR

**Date:** February 12, 2026  
**Status:** ✅ Complete  
**Testers:** UI/UX Team

---

## 1. Dark Mode Consistency

| Component | Light Mode | Dark Mode | Status |
|-----------|-----------|-----------|--------|
| Login page | ✅ | ✅ | Pass |
| Dashboard | ✅ | ✅ | Pass |
| Employee directory (DataGrid) | ✅ | ✅ | Pass |
| Employee form (create/edit) | ✅ | ✅ | Pass |
| Leave management views | ✅ | ✅ | Pass |
| Payroll tables | ✅ | ✅ | Pass |
| Attendance upload | ✅ | ✅ | Pass |
| Navigation sidebar | ✅ | ✅ | Pass |
| Dialogs & modals | ✅ | ✅ | Pass |
| Snackbar notifications | ✅ | ✅ | Pass |
| Swagger UI (`/api-docs`) | N/A | N/A | Excluded |

**Notes:**
- MUI theme provider handles dark/light mode via `ThemeProvider` and `CssBaseline`
- DataGrid inherits theme palette automatically
- Custom components use `theme.palette` tokens, not hardcoded colors

---

## 2. Mobile Responsiveness

### Device Matrix

| Device | Viewport | Browser | Status |
|--------|----------|---------|--------|
| iPhone 14 | 390×844 | Safari | ✅ Pass |
| iPhone SE | 375×667 | Safari | ✅ Pass |
| Samsung Galaxy S24 | 360×780 | Chrome | ✅ Pass |
| iPad Mini | 768×1024 | Safari | ✅ Pass |
| iPad Pro | 1024×1366 | Safari | ✅ Pass |
| Desktop 1080p | 1920×1080 | Chrome | ✅ Pass |
| Desktop 1440p | 2560×1440 | Chrome | ✅ Pass |

### Page-Level Results

| Page | Mobile | Tablet | Desktop | Notes |
|------|--------|--------|---------|-------|
| Login | ✅ | ✅ | ✅ | Form centered, responsive width |
| Dashboard | ✅ | ✅ | ✅ | Cards stack vertically on mobile |
| Employee list | ✅ | ✅ | ✅ | DataGrid horizontal scroll on small screens |
| Employee form | ✅ | ✅ | ✅ | Multi-column collapses to single column |
| Leave request | ✅ | ✅ | ✅ | Date pickers mobile-friendly |
| Leave approval | ✅ | ✅ | ✅ | Action buttons accessible |
| Payroll run | ✅ | ✅ | ✅ | Tables scroll horizontally |
| Attendance upload | ✅ | ✅ | ✅ | File upload button accessible |
| Navigation | ✅ | ✅ | ✅ | Hamburger menu on mobile, drawer on desktop |

---

## 3. Accessibility (a11y) Basics

| Check | Status | Notes |
|-------|--------|-------|
| Color contrast (WCAG AA) | ✅ | MUI default palette meets AA |
| Keyboard navigation | ✅ | Tab order logical, focus visible |
| Screen reader labels | ✅ | `aria-label` on icon buttons |
| Form labels | ✅ | All inputs have associated labels |
| Error announcements | ✅ | Form validation errors shown inline |

---

## 4. Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 120+ | ✅ Pass |
| Firefox | 120+ | ✅ Pass |
| Safari | 17+ | ✅ Pass |
| Edge | 120+ | ✅ Pass |

---

## 5. Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| None identified | — | — |

---

## 6. Sign-Off

| Role | Date | Status |
|------|------|--------|
| UI/UX Lead | Feb 12, 2026 | ✅ Approved |
| QA Lead | Feb 12, 2026 | ✅ Approved |

---

*Checklist based on Playwright visual test screenshots and manual spot checks.*
