# Story Quest — UI Audit Report

## Files Modified
| File | Changes |
|------|---------|
| [IntroScreen.tsx](file:///c:/STED/src/components/IntroScreen.tsx) | Mode button fix, min-h-dvh, removed animate-bounce |
| [RewardScreen.tsx](file:///c:/STED/src/components/RewardScreen.tsx) | Star rendering, leaderboard button positioning, pb-8 |
| [EventSequencer.tsx](file:///c:/STED/src/components/EventSequencer.tsx) | X icon overflow, double color-class, action button sizing |
| [StoryScreen.tsx](file:///c:/STED/src/components/StoryScreen.tsx) | Ribbon overflow, story body height, back button container |
| [CategorySelection.tsx](file:///c:/STED/src/components/CategorySelection.tsx) | Ribbon overflow, Grade 6 "Coming Soon" label, card min-h |
| [UserProfileHeader.tsx](file:///c:/STED/src/components/UserProfileHeader.tsx) | Score label "pts", aria-label for accessibility |
| [index.css](file:///c:/STED/src/index.css) | focus-visible outline, seq-block min-height |

---

## Issues Found & Fixed

### 🔴 Critical

#### 1. Inactive mode toggle buttons rendered with transparent background
- **File:** `IntroScreen.tsx`
- **Root Cause:** `.game-btn` CSS class applies `background: linear-gradient(var(--btn-top), var(--btn-bot))`. When no color modifier class (e.g. `game-btn-green`) is present, those CSS variables are `undefined` → gradient renders as `transparent`, overriding the Tailwind `bg-[#c2b291]` class.
- **Fix:** Replaced the broken inline bg approach with `game-btn-gold opacity-60` for inactive states — always has defined CSS variables.

#### 2. RewardScreen Leaderboard button clipping outside card
- **File:** `RewardScreen.tsx`
- **Root Cause:** `className="absolute -bottom-6 ..."` positions the button 24px below the card boundary. The parent flex container had no bottom padding to accommodate it, causing the button to be partially clipped by the viewport edge on small screens.
- **Fix:** Removed `absolute -bottom-6`. Button now sits in normal document flow below the card with `mt-4`. Added `pb-8` to the wood-board card itself.

#### 3. EventSequencer X icon using `absolute` with no relative ancestor
- **File:** `EventSequencer.tsx`
- **Root Cause:** `<X className="absolute right-1 ..."` was placed inside a `<div className="w-full h-full rounded flex ...">` which had no `position: relative` — the icon escaped to the nearest positioned ancestor (the outer board), causing it to appear in the wrong location and overlap slot text.
- **Fix:** Replaced absolute positioning with `flex-shrink-0` in the flex row. The `<>` fragment now holds `<p className="flex-1 ...">` and `<X className="flex-shrink-0 ...">` side by side cleanly.

---

### 🟠 High

#### 4. RewardScreen displays only 1 star icon regardless of score
- **File:** `RewardScreen.tsx`
- **Root Cause:** The `stars` variable (1, 2, or 3) was computed but never used in rendering — one `<Star size={96}>` was always rendered.
- **Fix:** Replaced with `Array.from({ length: 3 }).map(...)` — renders 3 star outlines, fills the earned count with golden color and larger size, dims the rest.

#### 5. StoryScreen reader title ribbon overflows on long story names
- **File:** `StoryScreen.tsx`
- **Root Cause:** `ribbon-blue` had `min-w-[70%] justify-center` with no max-width constraint. Long story titles like "The Great Peach Experiment #1: When Life Gives You Lemons, Make Peach Pie" would push the ribbon off-screen.
- **Fix:** Changed to `max-w-[88vw] md:max-w-[70vw]` with a `<span className="truncate">` inside.

#### 6. Story body reading area too small on mobile (50vh)
- **File:** `StoryScreen.tsx`
- **Root Cause:** `max-h-[50vh]` on mobile left very little reading area, especially with the sticky header taking ~80px.
- **Fix:** Increased to `max-h-[55vh] md:max-h-[60vh]`.

#### 7. CategorySelection ribbon "Choose a Story Category" can overflow viewport
- **File:** `CategorySelection.tsx`
- **Root Cause:** `text-2xl px-12 whitespace-nowrap` with no max-width on the absolutely-centered ribbon. On viewports < 400px the ribbon extends beyond screen edges.
- **Fix:** Added `max-w-[90vw] overflow-hidden` with `truncate` on the text span. Scaled down to `text-lg md:text-2xl` for mobile.

---

### 🟡 Medium

#### 8. EventSequencer action buttons inconsistent sizing across breakpoints
- **File:** `EventSequencer.tsx`
- **Root Cause:** Mix of `flex-1 md:flex-none`, `w-full md:w-auto`, and `order-last md:order-first` on sibling buttons created conflicting layout behavior — on some widths buttons would be unequal sizes or wrap oddly.
- **Fix:** Standardized all three buttons to consistent `py-2 px-8` (Back/Reset) and `py-2 px-10` (Submit) with no flex-grow conflicts. Changed `flex-col md:flex-row` → `flex-col sm:flex-row` for earlier layout switch.

#### 9. EventSequencer slot filled state double-applies color class
- **File:** `EventSequencer.tsx`
- **Root Cause:** The outer slot `<div>` already received `${placedData?.color}` (e.g. `game-btn-green`), and the inner div `<div className="... ${placedData.color}">` applied it again, doubling the gradient and potentially stacking box-shadow.
- **Fix:** Removed the inner wrapper div; content is now a `<>` fragment with `<p flex-1>` and `<X flex-shrink-0>`.

#### 10. Grade 6 pill gives no context for why it's disabled
- **File:** `CategorySelection.tsx`
- **Root Cause:** `opacity-50` with no label — children may think it's broken.
- **Fix:** Added "Coming Soon" sub-label in `text-[9px]` inside the pill. Changed opacity to `0.70` (more readable while still indicating unavailability).

#### 11. StoryScreen list Back button container is oversized
- **File:** `StoryScreen.tsx`
- **Root Cause:** `bg-black/40 backdrop-blur-sm p-4 rounded-xl shadow-2xl` wrapping a single button created a large dark panel that visually dominated the screen bottom.
- **Fix:** Removed the dark container; the button now sits cleanly below the card with `mt-4`.

---

### 🔵 Low

#### 12. Start button `animate-bounce` conflicted with framer-motion `whileHover`
- **File:** `IntroScreen.tsx`
- **Root Cause:** CSS `animate-bounce` (Tailwind keyframe) and Framer Motion's `whileHover={{ scale: 1.03 }}` on the parent both transform the button simultaneously, causing jitter.
- **Fix:** Removed `animate-bounce`. The button now responds only to the `whileHover/whileTap` from its parent motion.div — smooth and premium.

#### 13. No keyboard focus indicator on game buttons
- **File:** `index.css`
- **Root Cause:** No `focus-visible` rule defined; browsers defaulted to their own outlines (or suppressed them due to the border styling).
- **Fix:** Added `.game-btn:focus-visible { outline: 3px solid #ffd700; outline-offset: 3px; }` — gold outline matches the game aesthetic.

#### 14. Event card minimum height inconsistency
- **File:** `index.css`
- **Root Cause:** `.seq-block` had no `min-height`, so very short event text (1 line) produced small cards that looked inconsistent alongside longer ones.
- **Fix:** Added `min-height: 60px` to `.seq-block`.

#### 15. Score pill unreadable to children / screen readers
- **File:** `UserProfileHeader.tsx`
- **Root Cause:** A star icon followed by a bare number — no label.
- **Fix:** Added `<span className="...">pts</span>` and `aria-label="Score: X points"` on the pill div.

---

## Remaining Recommendations (Not Fixed — Outside Scope)

> [!NOTE]
> These are observations that require feature/logic changes, not pure styling fixes.

| # | Issue | Recommendation |
|---|-------|----------------|
| 1 | `EventCard.tsx` and `EventSlot.tsx` are dead code — `EventSequencer.tsx` renders its own inline cards/slots without using them | Remove or refactor to use the shared components |
| 2 | Leaderboard entries show no Grade column — rank sorting could mix Grade 5 and Grade 6 scores unfairly | Add `entry.grade` badge to each row |
| 3 | `StoryScreen` subtitle uses `story.fullStory.split('\n\n')[0]` which could be an empty string | Add a fallback: `?? 'Click to read...'` |
| 4 | `RewardScreen` confetti `Math.random()` is called outside a stable ref — particles re-randomize on re-render | Wrap in `useMemo` or `useRef` to stabilize positions |
| 5 | `CategorySelection` always shows the same 4 categories regardless of `profile.grade` | Filter categories by `profile.grade` when Grade 6 content is ready |
| 6 | `index.html` title contains a broken character (emoji rendering issue): `Story Quest 📖 Event Sequencing Adventure` | Fix the emoji in the `<title>` tag |

---

## Summary

**15 issues found across 7 files.**

| Severity | Found | Fixed |
|----------|-------|-------|
| 🔴 Critical | 3 | 3 ✅ |
| 🟠 High | 4 | 4 ✅ |
| 🟡 Medium | 4 | 4 ✅ |
| 🔵 Low | 4 | 4 ✅ |
| 📋 Remaining | 6 | — (out of scope) |

The application's visual design and theme are fully preserved. All gameplay logic is untouched.
