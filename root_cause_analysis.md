# Story Quest — Root Cause Analysis Report

---

## Issue 1 — Browser Refresh Always Returns to Login Screen

### Root Cause

All application state lives exclusively in React's `useState` — which is **purely in-memory**. When the browser page is refreshed, the JavaScript runtime restarts and all state resets to its initial values.

```
App.tsx line 20:  useState<Screen>('intro')        ← always resets to 'intro'
App.tsx line 21:  useState<UserProfile | null>(null) ← always resets to null
App.tsx line 24:  useState(0)                        ← score always resets to 0
```

Because `screen` resets to `'intro'` and `profile` resets to `null`, the app unconditionally lands on the IntroScreen every time. There is **no code anywhere in the project that reads from or writes to `localStorage` for the session** — the leaderboard service uses localStorage, but the user profile and screen state do not.

### Evidence

| File | Line | Code |
|------|------|------|
| `App.tsx` | 20 | `useState<Screen>('intro')` — hardcoded start screen |
| `App.tsx` | 21 | `useState<UserProfile \| null>(null)` — no localStorage read on mount |
| `App.tsx` | 20–25 | No `useEffect` that calls `localStorage.getItem` on load |

### Issue Category
**State management — no persistence layer for session data.**

### Recommended Fix
On `handleStart`, save the profile to `localStorage`. On app mount (`useEffect`), attempt to restore the profile from `localStorage`. If a valid saved profile is found, skip the intro screen and go directly to `'category'`.

```ts
// On mount — restore session
useEffect(() => {
  const saved = localStorage.getItem('storyquest_session');
  if (saved) {
    const p: UserProfile = JSON.parse(saved);
    setProfile(p);
    setScreen('category');
  }
}, []);

// On start — persist session
function handleStart(p: UserProfile) {
  localStorage.setItem('storyquest_session', JSON.stringify(p));
  setProfile(p);
  setScore(0);
  setScreen('category');
}
```

A "Log Out" action (clearing the key and returning to `'intro'`) should also be added to `UserProfileHeader`.

### Files to Modify
| File | Change |
|------|--------|
| `src/App.tsx` | Add `useEffect` to restore session on mount; update `handleStart` to persist |
| `src/components/UserProfileHeader.tsx` | Add logout button that clears `localStorage` and calls a new `onLogout` prop |

### Risk Level
🟢 **Low** — localStorage read/write is safe and side-effect-free. No game logic is touched. The only edge case is corrupted JSON in localStorage, which must be wrapped in `try/catch` (the leaderboard service already demonstrates this pattern).

---

## Issue 2 — Leaderboard Creates Duplicate Entries Per Student

### Root Cause

The `submitScore` function in `leaderboard.ts` **always appends a new entry** — it never checks if the student already has a record. Every time a student completes a story, a brand-new `LeaderboardEntry` object with a new `id` and `timestamp` is created and pushed onto the array.

```ts
// leaderboard.ts line 34–43
export function submitScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>): void {
  const existing = getLeaderboard();
  const newEntry = { ...entry, id: `entry-${Date.now()}`, timestamp: Date.now() };
  const updated = [...existing, newEntry].sort(...); // ← always spreads ALL existing + new
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
```

This is compounded by the call site in `App.tsx`:

```ts
// App.tsx line 52
submitScore({ name: profile.name, grade: profile.grade, score: newTotal });
```

`newTotal` is the **cumulative score** (previous score + round score). So after completing 3 stories, the leaderboard contains:

| Entry | Name | Score |
|-------|------|-------|
| 1 | Maria | 80 |
| 2 | Maria | 155 |
| 3 | Maria | 220 |

Three separate rows, all for the same student, all appearing on the leaderboard simultaneously.

### Evidence

| File | Line | Problem |
|------|------|---------|
| `leaderboard.ts` | 36 | `const existing = getLeaderboard()` — reads all entries including existing ones for this student |
| `leaderboard.ts` | 42 | `[...existing, newEntry]` — unconditional spread; never filters out the student's previous record |
| `leaderboard.ts` | 39 | `id: \`entry-${Date.now()}\`` — every call generates a unique ID, making deduplication impossible after the fact |
| `App.tsx` | 52 | `submitScore` called on every story completion, not just at session end |

### Issue Category
**localStorage persistence logic — missing upsert (update-or-insert) pattern.**

### Recommended Fix
Replace the append-only logic with an **upsert**: find the student's existing record by `name + grade`, update the score if the new score is higher (or always update — your choice), and remove the old entry before saving.

```ts
export function submitScore(entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>): void {
  seedIfEmpty();
  const existing = getLeaderboard();

  // Find if this student already has a record (match on name + grade)
  const previousIndex = existing.findIndex(
    e => e.name === entry.name && e.grade === entry.grade
  );

  let updated: LeaderboardEntry[];

  if (previousIndex !== -1) {
    // Update in place — keep the highest score, or always use latest
    const updatedEntry: LeaderboardEntry = {
      ...existing[previousIndex],
      score: entry.score,          // always use latest cumulative score
      timestamp: Date.now(),
    };
    updated = [
      ...existing.slice(0, previousIndex),
      updatedEntry,
      ...existing.slice(previousIndex + 1),
    ];
  } else {
    // New student — insert
    updated = [
      ...existing,
      { ...entry, id: `entry-${Date.now()}`, timestamp: Date.now() },
    ];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.sort((a, b) => b.score - a.score)));
}
```

### Files to Modify
| File | Change |
|------|--------|
| `src/services/leaderboard.ts` | Replace append logic with upsert in `submitScore` |

### Risk Level
🟢 **Low** — contained entirely within the service layer. No component changes required. Existing mock entries are unaffected (they have unique names). The fix does not change the function signature.

---

## Issue 3 — Grade 6 Stories Exist But UI Shows "Coming Soon"

### Root Cause

This is a **three-layer disconnection** — the data exists, but three separate places all exclude Grade 6 from appearing as a real category.

#### Layer 1 — `CategorySelection.tsx` hardcodes only 4 categories
```ts
// CategorySelection.tsx line 14
const categories: Category[] = ['Fable', 'Myth', 'Realistic Fiction', 'Legend'];
```
`'Grade 5'` and `'Grade 6'` are valid values in the `Category` type but are not in this array. They are never passed to `onSelect`, so clicking them is impossible.

#### Layer 2 — `categoryMeta` has no entries for Grade 5 or Grade 6
```ts
// data/stories.ts lines 37–42
export const categoryMeta = {
  Fable:              { image: '/cat_fable.png',   ... },
  Myth:               { image: '/cat_myth.png',    ... },
  'Realistic Fiction':{ image: '/cat_fiction.png', ... },
  Legend:             { image: '/cat_legend.png',  ... },
  // ← 'Grade 5' and 'Grade 6' are MISSING
};
```
`CategorySelection.tsx` line 50 reads `categoryMeta[cat]` — if `cat` is `'Grade 5'`, `meta` is `undefined`, which would cause a runtime crash when trying to read `meta.image`.

#### Layer 3 — The Grade indicator pills are decorative only
```tsx
// CategorySelection.tsx lines 89–95
<div className="game-btn game-btn-green pointer-events-none py-2 px-6">Grade 5</div>
<div className="game-btn game-btn-blue pointer-events-none ... opacity-70">
  <span>Grade 6</span>
  <span>Coming Soon</span>
</div>
```
`pointer-events-none` means these elements cannot be interacted with. The "Grade 6 Coming Soon" text was added during the UI audit as a cosmetic label — it was never meant to be a functional button, but it now falsely implies the category doesn't exist.

#### Confirmed: The Data IS There
```
Grade 6 stories in database: 11 stories, all with category: "Grade 6"
Grade 5 stories in database: 12 stories, all with category: "Grade 5"
Both are included in allStories via the adapter in data/stories.ts
```
The stories are in the `stories[]` array and would appear correctly in `StoryScreen` **if** the category were passed to it. The only thing missing is the UI path to reach them.

#### Also Confirmed: No Grade 5/6 category images exist in `/public`
```
public/cat_fable.png   ✅
public/cat_fiction.png ✅
public/cat_legend.png  ✅
public/cat_myth.png    ✅
cat_grade5.png         ❌ missing
cat_grade6.png         ❌ missing
```

### Evidence

| File | Line | Problem |
|------|------|---------|
| `CategorySelection.tsx` | 14 | Hardcoded 4-item array excludes `'Grade 5'` and `'Grade 6'` |
| `data/stories.ts` | 37–42 | `categoryMeta` has no entries for Grade 5/6 |
| `CategorySelection.tsx` | 89–95 | Grade pills are `pointer-events-none` — purely decorative |
| `public/` folder | — | No `cat_grade5.png` or `cat_grade6.png` images |

### Issue Category
**UI logic — hardcoded category list + missing categoryMeta entries + missing public assets.**

### Recommended Fix

**Step 1** — Add placeholder images (or generate them) for Grade 5 and Grade 6 and place them in `/public` as `cat_grade5.png` and `cat_grade6.png`.

**Step 2** — Add Grade 5 and Grade 6 entries to `categoryMeta` in `data/stories.ts`:
```ts
'Grade 5': { image: '/cat_grade5.png', color: '#2d5a8b', border: '#3a7abf', desc: 'Stories for Grade 5 readers' },
'Grade 6': { image: '/cat_grade6.png', color: '#5a2d8b', border: '#7a3abf', desc: 'Stories for Grade 6 readers' },
```

**Step 3** — Filter the category list in `CategorySelection.tsx` by the student's grade:
```ts
// Instead of a hardcoded array, show base categories + the student's own grade
const baseCategories: Category[] = ['Fable', 'Myth', 'Realistic Fiction', 'Legend'];
const gradeCategory = profile.grade as Category; // 'Grade 5' or 'Grade 6'
const categories = [...baseCategories, gradeCategory];
```

**Step 4** — Remove the `pointer-events-none` Grade pills (they'll be real cards now) or repurpose the bottom bar to show other info.

### Files to Modify
| File | Change |
|------|--------|
| `src/data/stories.ts` | Add `'Grade 5'` and `'Grade 6'` entries to `categoryMeta` |
| `src/components/CategorySelection.tsx` | Replace hardcoded `categories` array with profile-aware filter; remove static Grade pills |
| `public/` | Add `cat_grade5.png` and `cat_grade6.png` (assets needed) |

### Risk Level
🟡 **Medium** — The category array change and `categoryMeta` additions are low risk. The grade-aware filtering requires accessing `profile.grade`, which is already available as a prop. The main dependency is the two image assets — without them the category card backgrounds will be broken (a black card). Use a fallback color or placeholder image to mitigate.

---

## Summary Table

| # | Issue | Root Cause Category | Files | Risk |
|---|-------|---------------------|-------|------|
| 1 | Session lost on refresh | State management — no localStorage persistence | `App.tsx`, `UserProfileHeader.tsx` | 🟢 Low |
| 2 | Duplicate leaderboard entries | localStorage logic — append-only, no upsert | `leaderboard.ts` | 🟢 Low |
| 3 | Grade 6 "Coming Soon" despite data existing | UI logic — hardcoded category list + missing meta + missing assets | `CategorySelection.tsx`, `stories.ts`, `public/` | 🟡 Medium |
