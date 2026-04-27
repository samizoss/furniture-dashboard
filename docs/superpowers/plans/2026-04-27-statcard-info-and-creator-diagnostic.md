# StatCard Info Popups + Creator Data Diagnostic — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `info` popup to every StatCard in the Current Queue Status / This Month / Last Month sections, and add a `?debug=1`-gated diagnostic panel under "Requests by Creator" to see what Linear is actually returning.

**Architecture:** Pure client-side React work plus one GraphQL field addition. No new dependencies, no new files. Two files touched on the API side (the Vercel function and the matching vite-dev middleware that mirrors it), one file touched on the frontend.

**Tech Stack:** React 18, Vite 5, vanilla CSS-in-JS (inline styles), Vercel serverless functions, Linear GraphQL API. No test framework is installed; verification is `npm run build` (type/syntax) plus manual UI checks against `npm run dev`.

**Spec:** [docs/superpowers/specs/2026-04-27-statcard-info-and-creator-diagnostic-design.md](../specs/2026-04-27-statcard-info-and-creator-diagnostic-design.md)

---

## File Map

| File | What changes |
|---|---|
| `api/linear.js` | GraphQL query asks for `creator { name displayName email }`; response object's `creator` field becomes `{ name, displayName, email } \| null` |
| `vite.config.js` | Same change to the inlined middleware so local `npm run dev` returns the same shape |
| `src/FurnitureBankDashboard.jsx` | Creator normalization + grouping + label fallback; `?debug=1` diagnostic panel; `info` prop on `StatCard`; `info` text on 11 cards; one new `QUEUE_INFO` constant |

No new files. No deletions. No deps added.

## Local Verification Setup

You need a working `.env` with `LINEAR_API_KEY=lin_api_…` at the repo root for `npm run dev` to actually fetch from Linear. If the dashboard already loads with real data on this machine, you're set.

After every task that touches `.jsx`, `.js`, or `vite.config.js`, run `npm run build` once before committing — it's the only automated check this project has.

---

## Task 1: Extend Linear GraphQL query (Vercel function + vite middleware)

**Files:**
- Modify: `api/linear.js:18-39` and `api/linear.js:62-77`
- Modify: `vite.config.js:22-43` and `vite.config.js:68-83`

The `vite.config.js` middleware is a hand-mirrored copy of the Vercel function for local dev. Both must change in lockstep or local dev returns the old shape.

- [ ] **Step 1: Edit `api/linear.js` — add `name displayName` to creator field in the query**

Open `api/linear.js`. Replace the `query` constant block (lines 18–39) so the `creator` line reads `creator { name displayName email }`:

```js
    const query = `
      query($cursor: String) {
        issues(first: 100, after: $cursor, orderBy: updatedAt) {
          pageInfo { hasNextPage endCursor }
          nodes {
            identifier
            title
            priority
            createdAt
            completedAt
            updatedAt
            url
            state { name }
            labels { nodes { name } }
            project { name }
            team { name }
            creator { name displayName email }
            assignee { email }
          }
        }
      }
    `;
```

- [ ] **Step 2: Edit `api/linear.js` — pass full creator object through in the response mapper**

In the same file, find the `allIssues.push(...nodes.map(issue => ({...})))` block (around lines 63–77) and replace the `creator:` line so the mapper outputs an object instead of a flat string:

```js
      allIssues.push(...nodes.map(issue => ({
        identifier: issue.identifier,
        title: issue.title,
        status: issue.state?.name || 'Unknown',
        priority: issue.priority || 0,
        labels: (issue.labels?.nodes || []).map(l => l.name),
        project: issue.project?.name || null,
        team: issue.team?.name || null,
        createdAt: issue.createdAt,
        completedAt: issue.completedAt,
        updatedAt: issue.updatedAt,
        url: issue.url || null,
        creator: issue.creator
          ? {
              name: issue.creator.name || null,
              displayName: issue.creator.displayName || null,
              email: issue.creator.email || null,
            }
          : null,
        assignee: issue.assignee?.email || null,
      })));
```

- [ ] **Step 3: Edit `vite.config.js` — same query change in the dev middleware**

Open `vite.config.js`. Find the `query` constant inside the `api-linear` plugin (around lines 22–43) and change the `creator` line to `creator { name displayName email }`:

```js
            const query = `
              query($cursor: String) {
                issues(first: 100, after: $cursor, orderBy: updatedAt) {
                  pageInfo { hasNextPage endCursor }
                  nodes {
                    identifier
                    title
                    priority
                    createdAt
                    completedAt
                    updatedAt
                    url
                    state { name }
                    labels { nodes { name } }
                    project { name }
                    team { name }
                    creator { name displayName email }
                    assignee { email }
                  }
                }
              }
            `
```

- [ ] **Step 4: Edit `vite.config.js` — same mapper change**

In the same file, find `allIssues.push(...nodes.map(issue => ({...})))` inside the `api-linear` plugin (around lines 69–83) and update the `creator:` line:

```js
                allIssues.push(...nodes.map(issue => ({
                  identifier: issue.identifier,
                  title: issue.title,
                  status: issue.state?.name || 'Unknown',
                  priority: issue.priority || 0,
                  labels: (issue.labels?.nodes || []).map(l => l.name),
                  project: issue.project?.name || null,
                  team: issue.team?.name || null,
                  createdAt: issue.createdAt,
                  completedAt: issue.completedAt,
                  updatedAt: issue.updatedAt,
                  url: issue.url || null,
                  creator: issue.creator
                    ? {
                        name: issue.creator.name || null,
                        displayName: issue.creator.displayName || null,
                        email: issue.creator.email || null,
                      }
                    : null,
                  assignee: issue.assignee?.email || null,
                })))
```

- [ ] **Step 5: Verify the dashboard still loads (frontend tolerates the new shape)**

The current normalize step at `src/FurnitureBankDashboard.jsx:631` is `creator: i.creator?.email || i.creator || null`. With the new object, `i.creator?.email` resolves to the email string, so the existing dashboard keeps working unchanged. We're confirming that — not relying on it long-term (Task 2 replaces it).

Run: `npm run dev` and open http://localhost:5173. Expected: dashboard loads, "Requests by Creator" donut renders the same as before.

If you do not have a working `.env`, skip the live check and instead inspect the response shape with: `curl http://localhost:5173/api/linear | head -c 500` and confirm the first issue's `creator` field is either `null` or an object with `name`/`displayName`/`email` keys.

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: build succeeds with no errors. (vite warnings about chunk size are fine.)

- [ ] **Step 7: Commit**

```bash
git add api/linear.js vite.config.js
git commit -m "Extend Linear creator query to include name and displayName

Returns creator as an object { name, displayName, email } | null instead
of a flat email string. Frontend's existing normalize step still resolves
i.creator?.email, so the dashboard keeps working until Task 2 picks up
the new fields."
```

---

## Task 2: Frontend creator normalization, grouping, and label fallback

**Files:**
- Modify: `src/FurnitureBankDashboard.jsx` (normalize step ~line 631, grouping ~lines 755–756, donut data ~lines 809–811, drillCreator ~lines 835–838)
- Modify: `src/FurnitureBankDashboard.jsx` (add two helper functions near the other top-level constants)

- [ ] **Step 1: Add `creatorKey` and `creatorLabel` helper functions**

Open `src/FurnitureBankDashboard.jsx`. Below the `USER_DISPLAY` constant block (after line 84) and before the `const CLOSED_STATUSES` line, add:

```js
// Returns a stable identifier for grouping issues by creator. Falls back
// across email → name → displayName, so service accounts (no email) and
// external integrations still get distinct buckets when possible.
const creatorKey = (c) => {
  if (!c) return "unknown";
  return c.email || c.name || c.displayName || "unknown";
};

// Returns the legend/drill label for a creator. Curated USER_DISPLAY wins
// for known staff, then Linear's name/displayName, then the full email,
// then "Unknown".
const creatorLabel = (c) => {
  if (!c) return "Unknown";
  if (c.email && USER_DISPLAY[c.email]) return USER_DISPLAY[c.email];
  if (c.name) return c.name;
  if (c.displayName) return c.displayName;
  if (c.email) return c.email;
  return "Unknown";
};
```

- [ ] **Step 2: Update the normalize step to retain the full creator object**

In `src/FurnitureBankDashboard.jsx`, find the `i.creator?.email || i.creator || null` line (around line 631) inside the `setIssues` mapper. Replace just the `creator:` line so the surrounding object reads:

```js
        url: i.url || null,
        creator: i.creator
          ? (typeof i.creator === "string"
              ? { email: i.creator, name: null, displayName: null }
              : { email: i.creator.email || null, name: i.creator.name || null, displayName: i.creator.displayName || null })
          : null,
        assignee: i.assignee?.email || i.assignee || null,
```

The string-vs-object branch keeps the dashboard functional if the API ever falls back to the old shape (e.g., a stale Vercel deploy in front of an updated frontend).

- [ ] **Step 3: Update creator grouping to use `creatorKey` and retain the original object**

Find the existing two-line block (around lines 755–756):

```js
  const creatorCounts = {};
  filteredByTeam.forEach((i) => { const c = i.creator || "unknown"; creatorCounts[c] = (creatorCounts[c] || 0) + 1; });
```

Replace with:

```js
  const creatorCounts = {};
  const creatorObjects = {};
  filteredByTeam.forEach((i) => {
    const key = creatorKey(i.creator);
    creatorCounts[key] = (creatorCounts[key] || 0) + 1;
    if (!creatorObjects[key]) creatorObjects[key] = i.creator;
  });
```

- [ ] **Step 4: Update the donut data builder to use `creatorLabel`**

Find the `creatorDonut` block (around lines 809–811):

```js
  const creatorDonut = Object.entries(creatorCounts).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({
    label: USER_DISPLAY[k] || k.split("@")[0], value: v, color: PROJECT_COLORS[i % PROJECT_COLORS.length], filterKey: k,
  }));
```

Replace with:

```js
  const creatorDonut = Object.entries(creatorCounts).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({
    label: creatorLabel(creatorObjects[k]),
    value: v,
    color: PROJECT_COLORS[i % PROJECT_COLORS.length],
    filterKey: k,
  }));
```

- [ ] **Step 5: Update `drillCreator` to use `creatorKey`**

Find (around lines 835–838):

```js
  const drillCreator = (label, key) => {
    const items = filteredByTeam.filter((i) => (i.creator || "unknown") === key);
    openDrillDown(`Requests by ${label}`, items);
  };
```

Replace with:

```js
  const drillCreator = (label, key) => {
    const items = filteredByTeam.filter((i) => creatorKey(i.creator) === key);
    openDrillDown(`Requests by ${label}`, items);
  };
```

- [ ] **Step 6: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Manual verification in dev**

Run: `npm run dev` (Ctrl+C the previous one first). Open http://localhost:5173.
Expected:
- Dashboard loads.
- "Requests by Creator" donut renders. Total in the donut center matches the issue count.
- Click each legend entry → drill-down panel opens with issues for that creator.
- Click any donut slice → same.
- Click the "Unknown" segment (if present) → drill-down opens listing issues with no creator data.

If a previously-recognized staff member's name disappears or shows as raw email, sanity-check `USER_DISPLAY` — the lookup is by `email`, so if Linear returned the user without an email this is expected and Task 3's diagnostic panel will surface it.

- [ ] **Step 8: Commit**

```bash
git add src/FurnitureBankDashboard.jsx
git commit -m "Use full creator object for grouping and labels

Adds creatorKey/creatorLabel helpers. Groups by email, falling back to
Linear name then displayName when email is null (service accounts,
deleted users). Legend label uses Linear name when no curated mapping
exists, instead of the email prefix — fixes visual collisions when two
distinct emails share a prefix."
```

---

## Task 3: Diagnostic panel under "Requests by Creator" gated on `?debug=1`

**Files:**
- Modify: `src/FurnitureBankDashboard.jsx` (add a top-level `DEBUG_MODE` constant; render a panel inside the existing `Card title="Requests by Creator"` at ~lines 970–974)

- [ ] **Step 1: Add the `DEBUG_MODE` constant near the other top-level constants**

Open `src/FurnitureBankDashboard.jsx`. After the `creatorLabel` helper added in Task 2 (and before `const CLOSED_STATUSES`), add:

```js
// Set true when the URL includes ?debug=1. Used to surface diagnostic
// panels that should not appear in normal use.
const DEBUG_MODE = typeof window !== "undefined"
  && new URLSearchParams(window.location.search).get("debug") === "1";
```

- [ ] **Step 2: Render the diagnostic panel inside the creator card**

Find the `Card title="Requests by Creator"` block (around lines 970–974). Currently:

```jsx
              <Card title="Requests by Creator" info="All issues (open and closed) grouped by who created them in Linear.">
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <DonutChart data={creatorDonut} total={filteredByTeam.length} label="Total" onSegmentClick={drillCreator} />
                </div>
              </Card>
```

Replace with (note: the diagnostic IIFE is added below the donut; if `DEBUG_MODE` is false, nothing renders):

```jsx
              <Card title="Requests by Creator" info="All issues (open and closed) grouped by who created them in Linear.">
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <DonutChart data={creatorDonut} total={filteredByTeam.length} label="Total" onSegmentClick={drillCreator} />
                </div>
                {DEBUG_MODE && (() => {
                  const nullCount = filteredByTeam.filter((i) => i.creator === null).length;
                  const noEmailCount = filteredByTeam.filter((i) => i.creator !== null && !i.creator.email).length;
                  const distinctKeys = Object.keys(creatorCounts).filter((k) => k !== "unknown");
                  const rows = Object.entries(creatorCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
                    const c = creatorObjects[k];
                    return {
                      label: creatorLabel(c),
                      email: c?.email || "—",
                      name: c?.name || "—",
                      count: v,
                    };
                  });
                  return (
                    <div data-export-exclude="true" style={{
                      marginTop: 16,
                      padding: "12px 14px",
                      borderRadius: 8,
                      background: `${BRAND.warning}0a`,
                      border: `1px solid ${BRAND.warning}33`,
                      borderLeft: `3px solid ${BRAND.warning}`,
                      position: "relative",
                      fontFamily: "'Outfit', sans-serif",
                    }}>
                      <div style={{
                        position: "absolute", top: 8, right: 12,
                        fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                        color: BRAND.warning, textTransform: "uppercase",
                      }}>Debug</div>
                      <div style={{ fontSize: 11, color: BRAND.text, fontWeight: 600, marginBottom: 8 }}>Creator data quality</div>
                      <div style={{ fontSize: 11, color: BRAND.textMuted, marginBottom: 4 }}>
                        Null creators: <span style={{ color: BRAND.text, fontWeight: 600 }}>{nullCount}</span> (likely integrations, deleted users, or imports)
                      </div>
                      <div style={{ fontSize: 11, color: BRAND.textMuted, marginBottom: 4 }}>
                        No-email creators: <span style={{ color: BRAND.text, fontWeight: 600 }}>{noEmailCount}</span> (creator exists but has no email)
                      </div>
                      <div style={{ fontSize: 11, color: BRAND.textMuted, marginBottom: 10 }}>
                        Distinct creators: <span style={{ color: BRAND.text, fontWeight: 600 }}>{distinctKeys.length}</span>
                      </div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1.6fr 1.2fr auto",
                        gap: "4px 12px",
                        fontSize: 10,
                      }}>
                        <div style={{ color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Label</div>
                        <div style={{ color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Email</div>
                        <div style={{ color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Linear name</div>
                        <div style={{ color: BRAND.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Count</div>
                        {rows.map((r, i) => (
                          <React.Fragment key={i}>
                            <div style={{ color: BRAND.text }}>{r.label}</div>
                            <div style={{ color: BRAND.textMuted }}>{r.email}</div>
                            <div style={{ color: BRAND.textMuted }}>{r.name}</div>
                            <div style={{ color: BRAND.text, fontWeight: 600, textAlign: "right" }}>{r.count}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Card>
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual verification — debug off**

Run: `npm run dev`. Open http://localhost:5173 (no query string).
Expected: dashboard looks identical to before — no debug panel visible anywhere.

- [ ] **Step 5: Manual verification — debug on**

Open http://localhost:5173/?debug=1.
Expected:
- "Requests by Creator" card now shows the diagnostic block under the donut, with a "DEBUG" badge in the top-right.
- "Null creators" + "No-email creators" + the per-row counts together sum to the donut's total.
- The full table lists every distinct creator with label / email / Linear name / count.

If null + no-email + sum-of-row-counts ≠ total, something's miscounting — re-check Step 2. (The "unknown" row's count covers null + no-email + all-fields-null cases, so it should equal `nullCount + noEmailCount + (issues whose creator object had only-null fields, if any)`.)

- [ ] **Step 6: Commit**

```bash
git add src/FurnitureBankDashboard.jsx
git commit -m "Add ?debug=1 diagnostic panel under Requests by Creator

Hidden by default. When the URL contains ?debug=1, renders a panel under
the creator donut showing null-creator count, no-email count, distinct
count, and a per-creator table with label/email/name/count. Used to
investigate why some creators appear missing from the donut."
```

---

## Task 4: Add `info` prop support to `StatCard`

**Files:**
- Modify: `src/FurnitureBankDashboard.jsx:266-290` (the `StatCard` function)

- [ ] **Step 1: Replace the `StatCard` function**

Find the existing `StatCard` function (lines 266–290). Replace the entire function with:

```jsx
function StatCard({ label, value, sub, color, small, onClick, info }) {
  const [showInfo, setShowInfo] = useState(false);
  return (
    <div
      onClick={onClick}
      style={{
        background: BRAND.surface,
        border: `1px solid ${BRAND.surfaceBorder}`,
        borderRadius: 10,
        padding: small ? "14px 16px" : "18px 20px",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: small ? 80 : 100, position: "relative", overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.2s, background 0.2s",
      }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.borderColor = BRAND.accent + "44"; e.currentTarget.style.background = BRAND.surfaceHover; } }}
      onMouseLeave={(e) => { if (onClick) { e.currentTarget.style.borderColor = BRAND.surfaceBorder; e.currentTarget.style.background = BRAND.surface; } }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color || BRAND.accent, opacity: 0.7 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 6 }}>
        <div style={{ fontSize: "10px", color: BRAND.textDim, fontFamily: "'Outfit', sans-serif", textTransform: "uppercase", letterSpacing: "0.8px", textAlign: "center", fontWeight: 600 }}>{label}</div>
        {info && (
          <span
            onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
            style={{
              cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 13, height: 13, borderRadius: "50%", fontSize: 9, fontWeight: 700,
              background: showInfo ? BRAND.accent : BRAND.surfaceBorder,
              color: showInfo ? "#fff" : BRAND.textMuted,
              transition: "all 0.2s", flexShrink: 0, lineHeight: 1, textTransform: "none",
              fontFamily: "'Outfit', sans-serif",
            }}
            onMouseEnter={(e) => { if (!showInfo) e.currentTarget.style.background = BRAND.accent + "66"; }}
            onMouseLeave={(e) => { if (!showInfo) e.currentTarget.style.background = BRAND.surfaceBorder; }}
          >i</span>
        )}
      </div>
      {showInfo && info && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: 10, fontWeight: 400, color: BRAND.textMuted, fontFamily: "'Outfit', sans-serif",
            padding: "8px 10px", marginBottom: 8, borderRadius: 6, lineHeight: 1.5,
            background: `${BRAND.accent}0a`, border: `1px solid ${BRAND.accent}22`,
            borderLeft: `3px solid ${BRAND.accent}`,
            textAlign: "left", width: "100%",
          }}
        >{info}</div>
      )}
      <div style={{ fontSize: small ? "32px" : "38px", fontWeight: 800, color: BRAND.text, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "9px", color: BRAND.textDim, marginTop: 4, fontFamily: "'Outfit', sans-serif" }}>{sub}</div>}
      {onClick && <div style={{ fontSize: "8px", color: BRAND.textDim, marginTop: 4, fontFamily: "'Outfit', sans-serif", opacity: 0.6 }}>Click to view</div>}
    </div>
  );
}
```

Key behaviors baked in:
- The "i" button calls `e.stopPropagation()` so clicking it does NOT trigger the parent card's `onClick` (drill-down).
- The expanded info panel also stops propagation so clicking the panel text doesn't trigger drill-down.
- When `info` is undefined, the "i" button is not rendered and the layout is identical to the previous version.

- [ ] **Step 2: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual verification — existing cards still look unchanged**

Run: `npm run dev` and open http://localhost:5173.
Expected: every StatCard on the page looks pixel-identical to before this task (no `info` props are wired yet). Click any card → drill-down still opens.

- [ ] **Step 4: Commit**

```bash
git add src/FurnitureBankDashboard.jsx
git commit -m "Add optional info prop to StatCard

Mirrors the Card component's info-popup pattern: a small circled i next
to the label that toggles a description panel above the value. Click on
the i (or the panel) does not propagate to the card's drill-down handler.
No visual change when info is not provided."
```

---

## Task 5: Wire `info` props on Current Queue Status (5 cards)

**Files:**
- Modify: `src/FurnitureBankDashboard.jsx` (add `QUEUE_INFO` constant near the top; pass `info` in the queue StatCard loop at ~lines 950–959)

- [ ] **Step 1: Add the `QUEUE_INFO` constant**

Open `src/FurnitureBankDashboard.jsx`. Below the `QUEUE_CONFIG` constant block (after line 27) add:

```js
const QUEUE_INFO = {
  "Guidance Queue": "Open issues currently labeled with the Guidance Queue label. Excludes all closed statuses (Done, Merged, Cancelled, Parking Lot, Roadmap).",
  "Support Queue": "Open issues currently labeled with the Support Queue label. Excludes all closed statuses (Done, Merged, Cancelled, Parking Lot, Roadmap).",
  "COE Queue": "Open issues currently labeled with the COE Queue label. Excludes all closed statuses (Done, Merged, Cancelled, Parking Lot, Roadmap).",
  "Admin Queue": "Open issues currently labeled with the Admin Queue label. Excludes all closed statuses (Done, Merged, Cancelled, Parking Lot, Roadmap).",
  "Sorting Hat": "Open issues currently labeled with the Sorting Hat label. Excludes all closed statuses (Done, Merged, Cancelled, Parking Lot, Roadmap).",
  triage: "Open issues with no queue label assigned yet. Excludes all closed statuses (Done, Merged, Cancelled, Parking Lot, Roadmap).",
};
```

(The `Sorting Hat` entry is included because `QUEUE_CONFIG` defines it; it's currently filtered out of the visible card list at line 950 but the entry is harmless.)

- [ ] **Step 2: Pass `info` in the Current Queue Status loop**

Find the loop (around lines 950–959):

```jsx
              {Object.entries(queueCounts).filter(([k, v]) => v > 0 || ["Guidance Queue", "Support Queue", "COE Queue", "Admin Queue", "triage"].includes(k)).map(([key, count]) => (
                <StatCard
                  key={key}
                  label={QUEUE_CONFIG[key]?.short || key}
                  value={count}
                  color={QUEUE_CONFIG[key]?.color}
                  small
                  onClick={() => drillQueue(QUEUE_CONFIG[key]?.short || key, key)}
                />
              ))}
```

Add an `info` prop:

```jsx
              {Object.entries(queueCounts).filter(([k, v]) => v > 0 || ["Guidance Queue", "Support Queue", "COE Queue", "Admin Queue", "triage"].includes(k)).map(([key, count]) => (
                <StatCard
                  key={key}
                  label={QUEUE_CONFIG[key]?.short || key}
                  value={count}
                  color={QUEUE_CONFIG[key]?.color}
                  small
                  onClick={() => drillQueue(QUEUE_CONFIG[key]?.short || key, key)}
                  info={QUEUE_INFO[key]}
                />
              ))}
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Open http://localhost:5173.
Expected:
- Each of the 5 Current Queue Status cards now shows a small "i" next to its label.
- Click the "i" on Guidance Queue → info panel appears, says "Open issues currently labeled with the Guidance Queue label. Excludes all closed statuses (Done, Merged, Cancelled, Parking Lot, Roadmap)."
- Click the "i" again → panel collapses.
- Click the card body (not the "i") → drill-down opens as normal.
- Repeat for Support / COE / Admin / Triage cards.

- [ ] **Step 5: Commit**

```bash
git add src/FurnitureBankDashboard.jsx
git commit -m "Add info popups to Current Queue Status cards

Adds QUEUE_INFO map and wires the new StatCard info prop on all 5
queue cards (Guidance, Support, COE, Admin, Triage). Click the i icon
to see what each queue counts."
```

---

## Task 6: Wire `info` props on This Month and Last Month (6 cards)

**Files:**
- Modify: `src/FurnitureBankDashboard.jsx` (lines ~980–985 for This Month, ~1117–1122 for Last Month)

- [ ] **Step 1: Add `info` to the three This Month cards**

Find the This Month grid (around lines 980–985):

```jsx
              <StatCard label="Opened" value={openedThis} color={BRAND.accent}
                onClick={() => openDrillDown("Opened This Month", filteredByTeam.filter((i) => new Date(i.createdAt) >= thisMS))} />
              <StatCard label="Closed" value={closedThis} sub="All closed statuses" color={BRAND.orange}
                onClick={() => openDrillDown("Closed This Month", closed.filter((i) => { const dt = getClosedDate(i); return dt && new Date(dt) >= thisMS; }))} />
              <StatCard label="Completed" value={completedThis} sub="Done" color={BRAND.success}
                onClick={() => openDrillDown("Completed This Month (Done)", doneOnly.filter((i) => i.completedAt && new Date(i.completedAt) >= thisMS))} />
```

Replace with:

```jsx
              <StatCard label="Opened" value={openedThis} color={BRAND.accent}
                info="Issues created since the 1st of this month, regardless of current status."
                onClick={() => openDrillDown("Opened This Month", filteredByTeam.filter((i) => new Date(i.createdAt) >= thisMS))} />
              <StatCard label="Closed" value={closedThis} sub="All closed statuses" color={BRAND.orange}
                info="Issues moved to any closed status (Done, Merged, Cancelled, Parking Lot, Roadmap) since the 1st of this month, based on when the issue was moved to a closed status."
                onClick={() => openDrillDown("Closed This Month", closed.filter((i) => { const dt = getClosedDate(i); return dt && new Date(dt) >= thisMS; }))} />
              <StatCard label="Completed" value={completedThis} sub="Done" color={BRAND.success}
                info="Issues marked Done or Merged since the 1st of this month. A subset of Closed."
                onClick={() => openDrillDown("Completed This Month (Done)", doneOnly.filter((i) => i.completedAt && new Date(i.completedAt) >= thisMS))} />
```

- [ ] **Step 2: Add `info` to the three Last Month cards**

Find the Last Month grid (around lines 1117–1122):

```jsx
              <StatCard label="Opened" value={openedLast} color={BRAND.accent} small
                onClick={() => openDrillDown("Opened Last Month", filteredByTeam.filter((i) => { const d = new Date(i.createdAt); return d >= lastMS && d <= lastME; }))} />
              <StatCard label="Closed" value={closedLast} color={BRAND.orange} small
                onClick={() => openDrillDown("Closed Last Month", closed.filter((i) => { const dt = getClosedDate(i); if (!dt) return false; const d = new Date(dt); return d >= lastMS && d <= lastME; }))} />
              <StatCard label="Completed" value={completedLast} color={BRAND.success} small
                onClick={() => openDrillDown("Completed Last Month (Done)", doneOnly.filter((i) => { if (!i.completedAt) return false; const d = new Date(i.completedAt); return d >= lastMS && d <= lastME; }))} />
```

Replace with:

```jsx
              <StatCard label="Opened" value={openedLast} color={BRAND.accent} small
                info="Issues created during last month (the 1st through the last day)."
                onClick={() => openDrillDown("Opened Last Month", filteredByTeam.filter((i) => { const d = new Date(i.createdAt); return d >= lastMS && d <= lastME; }))} />
              <StatCard label="Closed" value={closedLast} color={BRAND.orange} small
                info="Issues moved to any closed status (Done, Merged, Cancelled, Parking Lot, Roadmap) during last month, based on when the issue was moved to a closed status."
                onClick={() => openDrillDown("Closed Last Month", closed.filter((i) => { const dt = getClosedDate(i); if (!dt) return false; const d = new Date(dt); return d >= lastMS && d <= lastME; }))} />
              <StatCard label="Completed" value={completedLast} color={BRAND.success} small
                info="Issues marked Done or Merged during last month. A subset of Closed."
                onClick={() => openDrillDown("Completed Last Month (Done)", doneOnly.filter((i) => { if (!i.completedAt) return false; const d = new Date(i.completedAt); return d >= lastMS && d <= lastME; }))} />
```

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`. Open http://localhost:5173.
Expected:
- Each of the 6 cards in This Month and Last Month shows an "i" icon next to its label.
- Click the "i" on each → matching info text appears.
- Click the card body → drill-down opens as before.

- [ ] **Step 5: Commit**

```bash
git add src/FurnitureBankDashboard.jsx
git commit -m "Add info popups to This Month and Last Month cards

Wires the StatCard info prop on all 6 cards (Opened/Closed/Completed in
both This Month and Last Month). Wording is consistent with the existing
Card info popups elsewhere on the dashboard."
```

---

## Task 7: Final cross-section sanity check

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 2: End-to-end manual walkthrough in dev**

Run: `npm run dev`. Open http://localhost:5173.

Walk through each item:
- All 5 Current Queue Status cards have a working "i" toggle. Click each, read the text, click again to collapse.
- All 3 This Month cards have a working "i" toggle.
- All 3 Last Month cards have a working "i" toggle.
- Clicking a card body still opens the drill-down (the "i" doesn't steal the click for the rest of the card).
- "Requests by Creator" donut still renders. The total in the donut center matches the issue count.
- Open http://localhost:5173/?debug=1. Diagnostic panel appears under the donut. Numbers add up. Per-creator table is populated.
- Remove `?debug=1`. Diagnostic panel is gone. Dashboard looks identical to pre-change.
- Click "Export Report". PDF still generates and looks correct. The diagnostic panel is also marked `data-export-exclude="true"`, so even with `?debug=1` active it does NOT appear in the exported PDF.

- [ ] **Step 3: Push (only if user explicitly approves a deploy)**

Do not push without confirming with the user — this dashboard auto-deploys to production on push to `master`.

```bash
# Only after explicit approval:
# git push
```

---

## Summary

7 tasks. ~30 minutes of focused work. No new dependencies. No new files. Two commits to API code (Task 1), four commits to the React dashboard (Tasks 2–6), one verification pass (Task 7).
