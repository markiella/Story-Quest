# PROJECT OVERVIEW REPORT
### Story Quest — Educational Event Sequencing Game
> **Analyzed:** 2026-07-17 · **Analyst:** Senior React Architect (Antigravity)
> **Workspace:** `c:\STED`

---

## 1. Executive Summary

**What is this application?**
"Story Quest" is a browser-based educational mini-game that teaches reading comprehension and narrative reasoning through an **event-sequencing mechanic**. Students read a short story, then drag/tap shuffled event cards into the correct chronological order.

**Overall Purpose**
To reinforce reading comprehension skills — specifically the understanding of plot structure and sequence of events — in an engaging, game-like environment. The app acts as both a classroom tool (Online / Teacher-Guided mode) and a self-study tool (Offline / Self-Paced mode).

**Intended Users**
- **Primary:** Filipino elementary students — specifically **Grade 5 and Grade 6** learners
- **Secondary:** Classroom teachers who monitor student scores via the leaderboard (Online mode)

**Learning Objective**
Understanding and correctly ordering the key events of a literary text across four Philippine/world curriculum genres: Fable, Myth, Realistic Fiction, and Legend. This maps directly to DepEd reading comprehension competencies.

---

## 2. Current Development Status

```
Overall Project Completion:  ~72%

UI:                ████████████████░░░░  80%
Core Game Logic:   ████████████████████  100%
Data Structure:    █████████████████░░░  85%
Offline Features:  ████████████████░░░░  80%
Online Features:   ████░░░░░░░░░░░░░░░░  20%  (leaderboard is localStorage-only)
Animations:        ███████████████░░░░░  75%
Responsive Design: ████████████████░░░░  80%
```

### ✅ Already Completed

- Full screen flow (Intro → Category → Story → Sequencer → Reward → Leaderboard)
- User profile creation (name, grade, game mode)
- Online / Offline mode toggle on intro screen
- 8 complete stories across 4 categories (2 per category)
- Event shuffling and click-to-place sequencer mechanic
- Slot fill detection and submit validation
- Proportional scoring (correct events ÷ total × 100)
- Per-round star rating system (1–3 stars based on score)
- Animated confetti reward screen
- Cumulative session score tracking
- LocalStorage-backed leaderboard with mock seed data
- "You" highlighting on the leaderboard
- Animated screen transitions (Framer Motion `AnimatePresence`)
- Stagger-animated category cards with image backgrounds
- Sticky user profile + score HUD (header present on all post-intro screens)
- Responsive layout (mobile/tablet/desktop breakpoints via Tailwind)
- Custom design system: wood-board aesthetic, parchment inners, 3D game buttons
- Google Fonts integration (Fredoka One, Nunito, Quicksand)
- Custom scrollbar styling
- SEO meta description and page title in `index.html`
- Custom CSS design tokens (CSS variables for brand colors)
- Reset functionality on the sequencer
- Back navigation on all screens

### ❌ Still Missing

- No actual backend / real API for leaderboard
- `EventCard.tsx` and `EventSlot.tsx` exist but are **not used** anywhere (dead code)
- Audio system — toggle button exists but `audio` state does absolutely nothing
- Grade filtering is hardcoded/cosmetic only — both Grade 5 & 6 see all stories
- No story completion tracking (a story can be replayed infinitely with no record)
- No "already completed" visual badge on story list items
- No timer / time-based scoring pressure
- No drag-and-drop (only click-to-select + click-to-place)
- No PWA / Service Worker (not installable offline)
- Grade 6 button is displayed as `opacity-50` (placeholder only, not wired)
- `favoriteNumber` field in `UserProfile` type — collected nowhere, used nowhere
- No teacher/admin dashboard
- Favicon still uses Vite default SVG
- No sound effects (SFX) or background music
- `src/assets/` still contains Vite boilerplate files (`vite.svg`, `typescript.svg`)

---

## 3. Technology Stack

| Category | Technology | Version |
|---|---|---|
| Framework | React | ^19.2.5 |
| Language | TypeScript | ~6.0.2 |
| Build Tool | Vite | ^8.0.10 |
| CSS Framework | Tailwind CSS v4 | ^4.2.4 |
| Animation | Framer Motion | ^12.38.0 |
| Icons | Lucide React | ^1.11.0 |
| Fonts | Google Fonts (Fredoka One, Nunito, Quicksand) | CDN |
| State Management | React `useState` (local component state only) | — |
| Routing | None (manual screen-switching via state) | — |
| Persistence | `localStorage` | Web API |
| Backend | None (not yet integrated) | — |
| Testing | None | — |
| Linting/Formatting | None configured | — |

> **Notable:** Tailwind CSS v4 is used (not v3). The v4 API uses `@import "tailwindcss"` and the `@tailwindcss/vite` plugin instead of a `tailwind.config.js` file.

---

## 4. Project Folder Structure

```
c:\STED\
├── index.html                  # HTML entry point; fonts, meta, SEO title
├── vite.config.ts              # Vite + React + Tailwind plugins
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies and scripts
│
├── public/                     # Static assets served at root URL
│   ├── bg_landscape.png        # Full-screen parallax background image
│   ├── cat_fable.png           # Category card image (Fable)
│   ├── cat_fiction.png         # Category card image (Realistic Fiction)
│   ├── cat_legend.png          # Category card image (Legend)
│   ├── cat_myth.png            # Category card image (Myth)
│   ├── favicon.svg             # Custom favicon (Vite SVG — still default)
│   └── icons.svg               # SVG sprite sheet (unused or for future use)
│
└── src/
    ├── main.tsx                # React DOM root mount point
    ├── App.tsx                 # Root component; all state + screen routing logic
    ├── types.ts                # All shared TypeScript types and interfaces
    ├── index.css               # Global CSS, design tokens, utility classes
    │
    ├── components/             # All UI screens and reusable components
    │   ├── IntroScreen.tsx         # Landing / profile creation screen
    │   ├── CategorySelection.tsx   # 4-category picker grid
    │   ├── StoryScreen.tsx         # Story list + inline StoryReader component
    │   ├── EventSequencer.tsx      # Core game mechanic (event bank + slots)
    │   ├── RewardScreen.tsx        # Score reveal with confetti animation
    │   ├── Leaderboard.tsx         # Ranked score table
    │   ├── UserProfileHeader.tsx   # Sticky HUD (name, grade, score)
    │   ├── EventCard.tsx           # ⚠️ Unused — standalone card component
    │   └── EventSlot.tsx           # ⚠️ Unused — standalone slot component
    │
    ├── data/
    │   └── stories.ts          # All 8 story objects + categoryMeta config
    │
    ├── services/
    │   └── leaderboard.ts      # localStorage read/write + mock seed data
    │
    └── assets/                 # Bundled assets (imported in JS)
        ├── hero.png            # ⚠️ Unused — possibly an early placeholder
        ├── vite.svg            # ⚠️ Vite boilerplate — not used in app
        └── typescript.svg      # ⚠️ Vite boilerplate — not used in app
```

**Folder Purposes:**
- `public/` — Assets that need stable public URLs (backgrounds, category images)
- `src/components/` — Every rendered screen and shared UI element
- `src/data/` — All static story content (acts like a local CMS)
- `src/services/` — Abstracted data-access layer (ready for API swap)
- `src/assets/` — Bundled/hashed assets imported directly in JS (currently unused by the app)

---

## 5. Screen Flow

```
[1] IntroScreen           ← Entry point; creates UserProfile
          ↓
[2] CategorySelection     ← 4-card grid; selects a genre Category
          ↓
[3] StoryScreen           ← Story list; select a title
          ↓ (story selected)
    [3b] StoryReader      ← Inline sub-view: reads full story text
          ↓
[4] EventSequencer        ← Core game: arrange 4 shuffled events
          ↓ (submit)
[5] RewardScreen          ← Shows stars, points earned, confetti
          ↓ (Next Level)
    → back to [2] CategorySelection
          ↓ (Leaderboard button — Online mode only)
[6] Leaderboard           ← Ranked table of all scores
          ↓ (Back)
    → back to [5] RewardScreen or [2] CategorySelection
```

**Screen Status:**

| Screen | Status | Notes |
|---|---|---|
| IntroScreen | ✅ Complete | Audio toggle is visual-only (no sound engine) |
| CategorySelection | ✅ Complete | Grade filter buttons are cosmetic |
| StoryScreen (list) | ✅ Complete | No completion badges |
| StoryReader (sub-view) | ✅ Complete | Scrollable parchment panel |
| EventSequencer | ✅ Complete | Click-to-place only; no drag |
| RewardScreen | ✅ Complete | Star count shown as single large star, not 3 separate |
| Leaderboard | ✅ Complete | All localStorage; no real backend |

---

## 6. Components

### `IntroScreen.tsx`
- **Purpose:** Landing screen; collects player name, grade, game mode, and audio preference
- **Props:** `{ onStart: (profile: UserProfile) => void }`
- **State:** `name`, `grade`, `mode`, `audio`, `error`
- **Status:** ✅ Complete. ⚠️ `audio` state is tracked but never wired to any audio engine.

### `CategorySelection.tsx`
- **Purpose:** Displays the 4 genre categories as large image cards with stagger animation
- **Props:** `{ profile, score, onSelect, onLeaderboard }`
- **Status:** ✅ Complete. ⚠️ Grade 5/6 filter buttons are purely decorative (no filtering logic).

### `StoryScreen.tsx`
- **Purpose:** Lists stories for the selected category; contains inline `StoryReader`
- **Props:** `{ profile, score, category, onStorySelected, onBack }`
- **Internal State:** `selected: Story | null`
- **Status:** ✅ Complete. `StoryReader` is a private function component inside the same file (not exported separately).

### `EventSequencer.tsx`
- **Purpose:** Core gameplay screen — shuffles events, manages click-to-select/place mechanic, grades submission
- **Props:** `{ story, profile, score, onComplete, onBack }`
- **State:** `shuffledEvents`, `slots`, `selectedCardId`, `submitted`, `feedback`
- **Key Functions:**
  - `shuffle<T>()` — Fisher-Yates shuffle utility
  - `handleCardClick()` — toggle card selection
  - `handleSlotClick()` — place selected card into a slot
  - `handleSlotRemove()` — remove a placed card from a slot
  - `handleReset()` — clear all slots
  - `handleSubmit()` — grade answer, show feedback banner, trigger `onComplete` after 1.7s delay
- **Scoring:** `Math.round((correctCount / totalEvents) * 100)` → 0–100
- **Status:** ✅ Complete (self-contained). ⚠️ Uses inline slot/card rendering — the separate `EventCard.tsx` and `EventSlot.tsx` files are not used.

### `RewardScreen.tsx`
- **Purpose:** Animated results screen with confetti particles, star rating, points display, and navigation
- **Props:** `{ profile, totalScore, lastEarned, onNextLevel, onLeaderboard }`
- **Star Logic:** `lastEarned >= 90 → 3★` · `>= 60 → 2★` · `else → 1★`
- **Message Map:** `{ 3: 'Story Master!', 2: 'Great Job!', 1: 'Nice Try!' }`
- **Status:** ✅ Complete. ⚠️ Displays a single `<Star>` icon, not 3 individual star icons (visual star count is not rendered separately).

### `Leaderboard.tsx`
- **Purpose:** Ranked score table with gold/silver/bronze medals and "(You)" highlighting
- **Props:** `{ profile, score, onBack }`
- **Status:** ✅ Complete. Only reads from localStorage; no real-time data.

### `UserProfileHeader.tsx`
- **Purpose:** Sticky HUD bar showing player name, grade pill, and current cumulative score
- **Props:** `{ profile, score }`
- **Status:** ✅ Complete. Used on all 5 post-intro screens.

### `EventCard.tsx` ⚠️ UNUSED
- **Purpose:** Standalone animated event card (click to select)
- **Props:** `{ text, isSelected, isPlaced, onClick }`
- **Status:** ❌ Not imported anywhere. Dead code — superseded by inline rendering inside `EventSequencer.tsx`.

### `EventSlot.tsx` ⚠️ UNUSED
- **Purpose:** Standalone slot drop zone with ordinal badge and placed-text display
- **Props:** `{ index, placedText, isActive, onClick, onRemove }`
- **Status:** ❌ Not imported anywhere. Dead code — superseded by inline rendering inside `EventSequencer.tsx`.

---

## 7. Game Logic

### Player Progress
- Progress is **session-only** — no persistence between browser sessions
- Each completed story adds `earned` points (0–100) to a cumulative `score`
- Score is displayed in the sticky HUD and the reward screen
- No "levels" concept — the player simply picks another story after each round

### Category System
- 4 hardcoded categories: `Fable | Myth | Realistic Fiction | Legend`
- Each category has 2 stories (8 total)
- `categoryMeta` in `stories.ts` provides image, color, border, and description per category
- **No grade-level filtering is implemented** despite Grade 5/6 buttons appearing in UI

### Event Sequencing
1. Story's `events[]` array is Fisher-Yates shuffled on mount (once, via `useState` initializer)
2. Each event is assigned a color class (`game-btn-green/red/blue/gold`) by its shuffled index
3. Player clicks a card in the "Event Bank" (left panel) → card becomes `selectedCardId`
4. Player clicks an empty slot (right panel) → `selectedCardId` fills that slot
5. Player clicks a filled slot → card is removed back (returned to bank as available)
6. All 4 slots must be filled before "Submit" activates

### Scoring
```
correct_count = number of slots where placed event id === correctOrder[slotIndex]
base_score = Math.round((correct_count / total_events) * 100)
clamped_score = Math.max(0, Math.min(100, base_score))
```
- 4/4 correct → 100 pts (3 stars)
- 3/4 correct → 75 pts (2 stars)
- 2/4 correct → 50 pts (2 stars)
- 1/4 correct → 25 pts (1 star)
- 0/4 correct → 0 pts (1 star)

### Rewards
- Stars: `>=90 → 3`, `>=60 → 2`, `else → 1`
- Confetti: 40 particles, 5 colors, staggered by 0.03s delay
- Feedback banner: `"🎉 Brilliant!"` (green) or `"Aww, nice try!"` (red), shows for 1.7s before navigating

### Navigation (in `App.tsx`)
All navigation is managed by a single `screen` state string. Handlers:
- `handleStart(profile)` → `'category'`
- `handleCategorySelect(cat)` → `'story'`
- `handleStorySelected(story)` → `'sequencer'`
- `handleSequencerComplete(earned)` → calculates score, conditionally submits to leaderboard service, → `'reward'`
- `handleNextLevel()` → clears story, → `'category'`
- `handleLeaderboard()` → `'leaderboard'`
- `handleLeaderboardBack()` → `'reward'` (if story exists) or `'category'`

---

## 8. Story Data Structure

### Schema (`src/types.ts` + `src/data/stories.ts`)

```typescript
interface StoryEvent {
  id: string;        // Unique event ID, e.g. 'f1-e1'
  text: string;      // Short one-sentence event description
}

interface Story {
  id: string;                  // Unique story ID, e.g. 'fable-1'
  category: Category;          // 'Fable' | 'Myth' | 'Realistic Fiction' | 'Legend'
  title: string;               // Display title
  fullStory: string;           // Multi-paragraph story text (paragraphs separated by \n\n)
  events: StoryEvent[];        // Array of 4 shuffleable event objects
  correctOrder: string[];      // Ordered array of event IDs defining the correct sequence
}
```

### Current Data
- 8 stories total (2 per category)
- Each story has exactly **4 events**
- `correctOrder` is always a 4-element array of event IDs in correct sequence

### Adding New Stories
Simply append a new object to the `stories` array in `src/data/stories.ts` following the schema. The app will automatically pick it up in `StoryScreen` (filtered by `s.category === category`). There is no CMS, database, or admin panel — it is fully data-driven from this single file.

### Category Metadata
```typescript
const categoryMeta: Record<string, { image: string; color: string; border: string; desc: string }> = {
  Fable:            { image: '/cat_fable.png', color: '#7c4f2a', ... },
  Myth:             { image: '/cat_myth.png',  color: '#1a3a5c', ... },
  'Realistic Fiction': { image: '/cat_fiction.png', ... },
  Legend:           { image: '/cat_legend.png', color: '#6b2d8b', ... },
};
```

---

## 9. State Management

### State Architecture
No global state library (no Redux, Zustand, Context). All state lives in `App.tsx` and is passed as props.

| State Variable | Type | Owner | Purpose |
|---|---|---|---|
| `screen` | `Screen` | `App.tsx` | Current active screen |
| `profile` | `UserProfile \| null` | `App.tsx` | Player identity (name, grade, mode) |
| `category` | `Category \| null` | `App.tsx` | Selected genre category |
| `story` | `Story \| null` | `App.tsx` | Selected story for current round |
| `score` | `number` | `App.tsx` | Cumulative session score |
| `lastEarned` | `number` | `App.tsx` | Points earned in the most recent round |
| `shuffledEvents` | `Event[]` | `EventSequencer.tsx` | Shuffled event bank (once per mount) |
| `slots` | `(string\|null)[]` | `EventSequencer.tsx` | Current card placements |
| `selectedCardId` | `string \| null` | `EventSequencer.tsx` | Currently highlighted card |
| `submitted` | `boolean` | `EventSequencer.tsx` | Whether answer has been submitted |
| `feedback` | `'correct'\|'wrong'\|null` | `EventSequencer.tsx` | Submission result |
| `selected` (story) | `Story \| null` | `StoryScreen.tsx` | Drill-down into StoryReader |
| `entries` | `LeaderboardEntry[]` | `Leaderboard.tsx` | Fetched leaderboard data |
| `particles` | `Particle[]` | `RewardScreen.tsx` | Confetti particle config |

### Data Flow
```
App.tsx (master state)
   ├── screen → controls which component renders
   ├── profile → passed down to all screens
   ├── score → passed down to all screens
   └── handlers → passed as callbacks (onStart, onSelect, onComplete, etc.)
```

### LocalStorage Usage
- **Key:** `'storyquest_leaderboard'`
- **When written:** `submitScore()` is called inside `handleSequencerComplete()` only when `profile.mode === 'online'`
- **When read:** `getLeaderboard()` is called on `Leaderboard` component mount
- **Seed data:** If localStorage key is absent, 5 mock entries are written automatically

---

## 10. Offline Features

### What Already Works Offline
- Complete game loop (all 6 screens)
- All 8 stories loaded from bundled TypeScript data
- Event sequencing and scoring
- Reward screen with animations
- Score persists within the browser session (in-memory only)
- The "Offline" mode toggle disables leaderboard submission

### What is Still Missing for Full Offline Capability
- **PWA / Service Worker:** App is not installable. Once the page loads it works, but a hard reload while offline would fail
- **No `manifest.json`** — not installable to home screen
- **Session persistence:** Closing the tab loses all progress (no `localStorage` save of session score)
- **Story completion tracking offline:** No record of which stories have been played

---

## 11. Online Features

### Current Implementation
- `GameMode` field on `UserProfile` is `'online'` or `'offline'`
- When mode is `'online'`, `submitScore()` writes to `localStorage` after each round
- Leaderboard button is conditionally shown only in online mode
- Leaderboard reads from `localStorage` (fake "online" behavior)

### Missing Online Implementation
- No HTTP API calls — `submitScoreRemote()` and `getLeaderboardRemote()` are commented-out TODOs in `leaderboard.ts`
- No authentication (no teacher/student login)
- No class/session management
- No real-time leaderboard updates

### Future Integration Points
The `leaderboard.ts` service is **cleanly architected for a drop-in API swap**:

```typescript
// TODO (from leaderboard.ts lines 46–48):
// export async function submitScoreRemote(entry: ...) { await fetch('/api/scores', ...) }
// export async function getLeaderboardRemote(): Promise<LeaderboardEntry[]> { ... }
```

**Backend Readiness:** The `LeaderboardEntry` type is fully defined:
```typescript
interface LeaderboardEntry {
  id: string;
  name: string;
  grade: GradeLevel;
  score: number;
  timestamp: number;
}
```
A REST or WebSocket backend can be integrated with minimal frontend changes — only `leaderboard.ts` needs updating.

**Leaderboard Architecture (Future):**
- `POST /api/scores` — submit a score entry
- `GET /api/scores?grade=5` — fetch filtered leaderboard
- Optionally: WebSocket subscription for live updates

---

## 12. UI / UX Review

### Design Language
The app follows a cohesive **Educational Game / Storybook** aesthetic:
- **Theme:** Enchanted forest adventure — wood boards, parchment scrolls, gold coins, medieval typography
- **Color Palette:** Earth tones (wood brown `#4a2e12`, parchment `#ffeebd`) + vivid game button accents (green, blue, red, gold)
- **Typography:** `Fredoka One` (headings/labels — playful, rounded) + `Nunito` (body — readable, friendly)
- **3D Buttons:** CSS `box-shadow` trick (downward colored shadow = 3D press depth) with `:active` translateY
- **Boards:** `.wood-board` with corner nail pseudo-elements, `.parchment-inner` with subtle inner border
- **Background:** Fixed parallax landscape PNG on all screens

### Design Approach
- ✅ **Mobile-first** — all components start at a mobile layout and scale up via `md:` / `lg:` breakpoints
- ✅ **Micro-animations** — Framer Motion throughout (spring transitions, stagger, scale on tap)
- ✅ **Consistent design system** — CSS custom properties for all brand colors, reusable class names
- ✅ **Child-appropriate** — large tap targets, clear visual hierarchy, simple instructions

### Recommended UX Improvements (without architecture changes)
1. **Star Rating:** Render 3 individual star icons (filled/empty) instead of one large star — more intuitive
2. **Story Completion Badges:** Show a ✅ or 🏆 on stories in the list that the player has already completed
3. **Slot Reorder:** Add numbered feedback showing which slots were correct (green) vs. wrong (red) after submission
4. **Grade Filtering:** Actually filter stories shown to Grade 5 vs. Grade 6 students
5. **Audio Feedback:** At minimum, add a simple CSS animation or vibration on correct/wrong submission
6. **Session Resume:** Save score to localStorage so refreshing doesn't reset progress

---

## 13. Existing Assets

### Images (in `/public/`)
| File | Usage |
|---|---|
| `bg_landscape.png` | Full-screen fixed background on all screens (~781 KB) |
| `cat_fable.png` | Fable category card background (~937 KB) |
| `cat_fiction.png` | Realistic Fiction category card background (~888 KB) |
| `cat_legend.png` | Legend category card background (~876 KB) |
| `cat_myth.png` | Myth category card background (~955 KB) |
| `favicon.svg` | Browser tab icon (custom SVG, not Vite default) |
| `icons.svg` | SVG sprite sheet — present but usage unclear |

### Images (in `/src/assets/`) ⚠️ Likely Unused
| File | Usage |
|---|---|
| `hero.png` | Not imported anywhere — leftover (~13 KB) |
| `vite.svg` | Vite boilerplate — not imported in app |
| `typescript.svg` | Vite boilerplate — not imported in app |

### Icons
- **Lucide React** (`lucide-react ^1.11.0`): Used throughout
  - `Wifi`, `WifiOff`, `Map`, `Play`, `UserRound`, `GraduationCap`, `Volume2`, `VolumeX` — IntroScreen
  - `BookOpen` — CategorySelection, StoryScreen
  - `ChevronRight`, `ChevronLeft` — StoryScreen, Leaderboard
  - `Check`, `X`, `Undo2` — EventSequencer
  - `Star`, `Trophy`, `ArrowRight` — RewardScreen
  - `Trophy`, `ChevronLeft`, `UserRound` — Leaderboard

### Fonts
- **Fredoka One** (headings, button labels, game UI) — Google Fonts CDN
- **Nunito** (body text, labels, story paragraphs) — Google Fonts CDN
- **Quicksand** (loaded but not actively used in CSS) — Google Fonts CDN

### Animations
- Framer Motion spring transitions on all screen mounts/unmounts
- `AnimatePresence mode="wait"` for screen-level transitions
- Stagger children on category cards
- Confetti particle system (40 particles, CSS `transform`)
- `@keyframes starPop` — CSS animation (defined, available for use)
- `@keyframes slotPulse` — slot-active pulse animation (used on active sequencer slots)
- Hover/tap scale effects on all interactive elements

### Sound
- **None implemented.** `Volume2`/`VolumeX` icons and `audio` state exist in `IntroScreen` but the toggle is wired to nothing.

---

## 14. Missing Features

### 🔴 Priority: High
1. **Audio System** — The toggle exists but does nothing. At minimum, add Web Audio API beeps for correct/wrong/button-click
2. **Grade-Level Story Filtering** — Grade 5 and Grade 6 students should see different story sets; currently all see the same 8
3. **Story Completion Persistence** — Track which stories a player has finished (localStorage per session)
4. **Real 3-Star Visual** — Reward screen shows a single large star instead of 1–3 filled star icons
5. **Correct/Wrong Per-Slot Feedback** — After submission, highlight which slots were right (green) and which were wrong (red)

### 🟡 Priority: Medium
6. **Backend API Integration** — Replace localStorage leaderboard with real HTTP calls (`fetch('/api/scores')`)
7. **PWA / Service Worker** — Make the app installable and truly offline-capable
8. **Drag-and-Drop** — More intuitive than click-to-select for tablet/desktop users
9. **Dead Code Cleanup** — Remove `EventCard.tsx`, `EventSlot.tsx`, and unused `src/assets/` files
10. **`favoriteNumber` Field** — Either use it (e.g., lucky number shown on reward) or remove it from the type
11. **`Quicksand` Font** — Remove from HTML or start using it in the design
12. **Favicon** — Replace `vite.svg` icon reference with the actual custom favicon

### 🟢 Priority: Low
13. **Timer / Time Pressure** — Optional countdown timer for competitive play
14. **Teacher Dashboard** — Admin view for seeing class-wide performance
15. **More Stories** — Expand beyond 2 stories per category
16. **Difficulty Levels** — Stories with 5–6 events instead of always 4
17. **Progress Bar** — Visual indicator of how far through a session the student is
18. **Share / Print Result** — Screenshot-style result card for printing or sharing

---

## 15. Bugs / Technical Debt

### 🐛 Possible Bugs
1. **`handleLeaderboardBack()` edge case:** After navigating Intro → Category → Leaderboard (without ever playing), `story` is `null`, so back goes to `'category'`. This is correct, but if called from category screen it should go directly back — the current check `story ? 'reward' : 'category'` works but is fragile.
2. **Score not clamped on display:** `handleSequencerComplete` clamps `earned` to 0–100 correctly, but the raw `base` score in `EventSequencer` is already 0–100 by math, making the clamp redundant (not a bug, just defensive noise).
3. **Leaderboard "You" detection:** Identity check is `entry.name === profile.name && entry.grade === profile.grade` — two different students with the same name and grade would both be highlighted.
4. **Category card Grade buttons:** The "Grade 5" and "Grade 6" buttons are rendered with `pointer-events-none` — they cannot be clicked even when they need to be functional. This is a design decision, but also a trap for the next developer.

### ⚠️ Incomplete Code
5. **Audio system:** `audio` state in `IntroScreen` has no effect — no `<audio>` element, no Web Audio API, nothing.
6. **`EventCard.tsx` / `EventSlot.tsx`:** Complete, well-animated components that exist but are never imported. These appear to be a **first-draft implementation** that was superseded by the inline code in `EventSequencer.tsx`.
7. **`favoriteNumber`** in `UserProfile`: Declared in the type, never collected in the UI, never used in logic.
8. **`Quicksand` font:** Imported in HTML, declared nowhere in CSS.
9. **Remote leaderboard stubs:** The two commented async functions in `leaderboard.ts` are TODO stubs with no implementation.

### 🗑️ Unused Files
- `src/components/EventCard.tsx`
- `src/components/EventSlot.tsx`
- `src/assets/hero.png`
- `src/assets/vite.svg`
- `src/assets/typescript.svg`
- `public/icons.svg` (unclear if intentionally kept for future use)

### 📊 Performance Concerns
- All 5 category images (`~3.4 MB` total in `/public/`) are loaded when the category screen renders. No lazy-loading or `loading="lazy"` applied.
- `bg_landscape.png` (~781 KB) is used as a CSS `background-image` on every screen — cannot use native `<img loading="lazy">` — consider WebP conversion.
- Confetti: 40 Framer Motion-animated `<div>` elements are mounted simultaneously on the reward screen. Fine for most devices; may jank on low-end phones.
- Fonts: 3 font families loaded from Google Fonts CDN — `Quicksand` is unused weight.

### 🔧 Code Quality Concerns
- `StoryReader` is a private function component declared inside `StoryScreen.tsx`. It could be extracted to its own file for maintainability.
- The feedback style override in `EventSequencer.tsx` (`style={feedback === 'correct' ? { '--tw-gradient-from': ... } as any : ...}`) uses `as any` to work around TypeScript CSS variable typing — a minor type safety smell.
- No ESLint, Prettier, or any code formatter is configured — code style consistency depends entirely on the developer.
- No unit tests anywhere.

---

## 16. Suggested Next Steps

Listed in recommended development order:

### Step 1 — Clean Up Dead Code
**Why first:** Remove `EventCard.tsx`, `EventSlot.tsx`, and `src/assets/` boilerplate files. Starting with a clean codebase prevents confusion about which implementations are canonical.

### Step 2 — Fix the Star Rating Display
**Why:** The reward screen shows one large `<Star>` regardless of the 1–3 star logic. This is a **player-facing bug** — the visual doesn't match the computed stars. High user impact, very low effort.

### Step 3 — Add Per-Slot Correct/Wrong Feedback
**Why:** Currently after submission, all slots look the same. Students need to see which answers were right vs. wrong to learn. This is the **core pedagogical gap** in the current implementation.

### Step 4 — Implement Grade-Level Filtering
**Why:** Grade 5 and Grade 6 students see identical content. The UX implies differentiation (the buttons exist). Tag stories with `grade: 'Grade 5' | 'Grade 6' | 'Both'` in the `Story` type and filter in `StoryScreen`.

### Step 5 — Add Story Completion Tracking
**Why:** Without tracking, students have no sense of progress. Save a `completedStories: string[]` (array of story IDs) to `localStorage`. Show a completion badge on the story list.

### Step 6 — Audio System (Minimal)
**Why:** The toggle exists and does nothing — this is a broken promise to the user. Implement using the Web Audio API (no external library needed) with short tones for correct/wrong/button-tap.

### Step 7 — PWA Support
**Why:** Target users are students on school tablets — they need offline reliability. Add a `manifest.json` and a basic Service Worker to cache all assets. Vite makes this trivial with `vite-plugin-pwa`.

### Step 8 — Backend API Integration
**Why:** The leaderboard currently simulates online behavior with localStorage. Connect `leaderboard.ts` to a real REST API so teachers can see class-wide performance across sessions.

### Step 9 — Teacher Dashboard
**Why:** Without a view into student performance, the "Teacher-Guided" mode label is aspirational. Build a simple read-only dashboard showing per-student and per-story completion rates.

### Step 10 — Drag-and-Drop
**Why:** On tablets, drag-and-drop is far more intuitive than the two-click select-then-place mechanic. Framer Motion's `Reorder` API or `@dnd-kit` would integrate cleanly with the existing slot state.

---

## 17. Overall Architecture Review

| Category | Score | Notes |
|---|---|---|
| **Scalability** | 7/10 | `stories.ts` scales linearly; adding many stories or features would require database/CMS integration. State management will strain as features grow. |
| **Maintainability** | 7/10 | Files are focused and short. No linting/formatting configured. Dead code (`EventCard`, `EventSlot`) reduces clarity. |
| **Code Organization** | 8/10 | Clean folder separation (`components/`, `data/`, `services/`, `types.ts`). `StoryReader` inside `StoryScreen` breaks the pattern slightly. |
| **Component Reusability** | 6/10 | `UserProfileHeader` is well-reused. Game button/board styles are in CSS utilities, not React components. `EventCard`/`EventSlot` were designed for reuse but abandoned. |
| **Data-Driven Design** | 8/10 | Stories and category metadata are fully data-driven. Adding new stories requires zero code changes — only data changes. |
| **Future Online Integration** | 8/10 | `leaderboard.ts` is the exact abstraction needed — swap `localStorage` calls for `fetch` calls and the rest of the app is unchanged. `LeaderboardEntry` type is backend-ready. |

**Average: 7.3 / 10** — A solid, well-structured MVP. The architecture is clean and intentional; the major gaps are features (audio, persistence, backend) rather than architectural flaws.

---

## 18. Final Summary

### Current Project Maturity
**Early Beta.** The core game loop is fully functional and visually polished. The app can be demonstrated to stakeholders and piloted in a classroom today (offline mode). Online features are simulated and not production-ready.

### Overall Readiness
- ✅ Ready for: Internal demo, single-classroom pilot test, offline use
- ❌ Not ready for: School-wide deployment, teacher-monitored sessions, production release

### Estimated Remaining Work

| Phase | Work Items | Estimated Effort |
|---|---|---|
| Phase 1 — Bug Fixes & Polish | Star UI fix, per-slot feedback, dead code cleanup | 1–2 days |
| Phase 2 — Core Feature Completion | Grade filtering, story tracking, audio, `favoriteNumber` cleanup | 3–5 days |
| Phase 3 — PWA & Offline | Service Worker, manifest, offline detection | 2–3 days |
| Phase 4 — Backend Integration | REST API + real leaderboard | 5–7 days (depends on backend) |
| Phase 5 — Teacher Dashboard | Admin view, class reports | 5–7 days |
| **Total** | | **~16–24 developer-days** |

### Potential Risks
1. **No backend at all** — Online mode is fake; if this is demoed to teachers as "real," expectations will be misaligned
2. **No testing** — Any refactor could silently break game logic with no safety net
3. **Audio scope creep** — Adding proper audio (background music, SFX, voiceover) is a large hidden scope item
4. **Content bottleneck** — Adding more stories requires a developer; no content editor or CMS exists
5. **Performance on low-end devices** — Large unoptimized PNG images + Framer Motion may be slow on budget Android tablets common in Philippine classrooms

### Recommended Roadmap to Version 1.0

```
v0.8  (Current)  — Core game loop complete, localStorage leaderboard
v0.85            — Bug fixes: star UI, per-slot feedback, grade filtering
v0.9             — Story completion tracking, audio, PWA/offline install
v0.95            — Real backend API, genuine online leaderboard
v1.0             — Teacher dashboard, content expansion (16+ stories), QA pass
```
