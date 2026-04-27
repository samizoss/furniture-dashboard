# StatCard Info Popups + Creator Data Diagnostic — Design

Date: 2026-04-27

## Overview

Two updates to the Furniture Bank Linear Dashboard:

1. **Creator data diagnostic** — Investigate why "Requests by Creator" appears to be missing creators. Add visibility (gated behind `?debug=1`) into what Linear is actually returning, plus a small label-fallback improvement that helps the donut today regardless of what we find.
2. **StatCard info popups** — Add the same circled-"i" popup pattern that `Card` already uses to the `StatCard` component, then attach descriptions to all 11 stat cards in the Current Queue Status, This Month, and Last Month sections.

Both changes are scoped to two files (`api/linear.js`, `src/FurnitureBankDashboard.jsx`).

---

## Part 1 — Creator Data Diagnostic

### Background

`Requests by Creator` ([FurnitureBankDashboard.jsx:970](../../../src/FurnitureBankDashboard.jsx#L970)) renders a donut grouped by `issue.creator`. The current Linear query at [api/linear.js:34](../../../api/linear.js#L34) only requests `creator { email }`, and the dashboard groups by that email. Issues where Linear returns `creator: null` (integrations, deleted users, some imports) or where `creator.email` is null (service accounts) all collapse into a single `"unknown"` bucket, giving the impression that creators are "missing." Display labels also fall back to `email.split("@")[0]`, so two distinct emails with the same prefix can visually look like one creator.

### Goals

- Get hard data on what Linear is returning for `creator` so we can decide a real fix later.
- Improve the legend label fallback now (low risk, free win).
- Don't change the donut's default appearance or which issues end up in which slice for users who already had emails on every creator. The grouping key becomes more robust (falls back beyond just email), but the overall behavior remains: one slice per distinct creator, with all truly-anonymous creators bucketed together.

### Changes

#### 1. Extend the GraphQL query

In `api/linear.js`, change `creator { email }` to `creator { name displayName email }`. Pass all three through in the response object as a `creator` object (not just an email string):

```js
creator: issue.creator
  ? { name: issue.creator.name, displayName: issue.creator.displayName, email: issue.creator.email }
  : null
```

This is a non-breaking shape change at the API boundary because the frontend's `normalize` step at [FurnitureBankDashboard.jsx:631](../../../src/FurnitureBankDashboard.jsx#L631) already does `i.creator?.email || i.creator || null`. We update that step to keep the full object instead of flattening to email.

#### 2. Frontend creator handling

Update the issue normalization to retain the creator object:

```js
creator: i.creator
  ? (typeof i.creator === "string"
      ? { email: i.creator, name: null, displayName: null }
      : { email: i.creator.email || null, name: i.creator.name || null, displayName: i.creator.displayName || null })
  : null
```

Update the creator grouping at [FurnitureBankDashboard.jsx:755-756](../../../src/FurnitureBankDashboard.jsx#L755-L756) to:
- Treat `creator` as null when the object is null OR when all three fields (`email`, `name`, `displayName`) are null/empty.
- Group by a stable identifier: `creator.email || creator.name || creator.displayName || "unknown"`.
- For each group, retain the full creator object (first one seen) for label rendering.

Update the donut data builder at [FurnitureBankDashboard.jsx:809-811](../../../src/FurnitureBankDashboard.jsx#L809-L811) to compute the legend label using this priority:

1. `USER_DISPLAY[email]` (curated staff names)
2. `creator.name` (from Linear)
3. `creator.displayName` (from Linear)
4. `email` in full (not the prefix)
5. `"Unknown"` (when there's no identifier at all)

Update `drillCreator` at [FurnitureBankDashboard.jsx:835-838](../../../src/FurnitureBankDashboard.jsx#L835-L838) to match against the new key.

#### 3. Diagnostic panel (gated by `?debug=1`)

Read `URLSearchParams(window.location.search).get("debug") === "1"` once, store in a constant. When true, render a panel inside the existing `Card title="Requests by Creator"`, below the donut.

Panel content:

- **Null creators**: count of issues where `creator === null` (likely integrations, deleted users, or imports).
- **No-email creators**: count of issues where `creator !== null` but `creator.email == null`.
- **Distinct creators**: total distinct group keys (excluding the `"unknown"` bucket).
- **Full creator list**: every group as a row with `label · email (or "—") · name (or "—") · count`, sorted by count desc.

Visual treatment: a faint bordered block (similar style to the existing info popup at [FurnitureBankDashboard.jsx:326-333](../../../src/FurnitureBankDashboard.jsx#L326-L333)) with a small uppercase "DEBUG" label badge in the top-right corner of the panel (10px, dimmed) so it's obvious this is a diagnostic surface, not a permanent UI element.

When `?debug=1` is not set, the dashboard looks identical to today.

### Out of scope

- No permanent split of "unknown" into "Integration" / "Deleted user" / etc.
- No change to how the donut groups or colors creators (beyond labels).
- No actual creator-data "fix" — we ship the diagnostic, look at the data, then decide.

---

## Part 2 — StatCard Info Popups

### Background

The `Card` component ([FurnitureBankDashboard.jsx:303-337](../../../src/FurnitureBankDashboard.jsx#L303-L337)) already accepts an `info` prop that renders a circled "i" next to the title. Clicking it expands a small panel above the children. The `StatCard` component ([FurnitureBankDashboard.jsx:266-290](../../../src/FurnitureBankDashboard.jsx#L266-L290)) does not.

The 11 stat cards in three sections need the same treatment:

- Current Queue Status: 5 cards (Guidance Queue, Support Queue, COE Queue, Admin Queue, Triage)
- This Month: 3 cards (Opened, Closed, Completed)
- Last Month: 3 cards (Opened, Closed, Completed)

### Goals

- Add an `info` prop to `StatCard` that mirrors the `Card` pattern in look and behavior.
- Keep the existing visual feel of the stat card (centered label, large value, optional sub) intact when the popup is closed.
- Add accurate, user-friendly info text to all 11 cards.

### Changes

#### 1. Extend `StatCard`

Add `info` to the prop list. Manage a local `showInfo` state. When `info` is provided:

- Render a small circled "i" inline-right of the label, same vertical alignment, same font scale as the label (~10px). Use the same colors and hover behavior as `Card`'s "i" button.
- Stop click propagation on the "i" so it doesn't trigger the card's `onClick` drill-down.
- When `showInfo` is true, render a small text block above the value (between label row and value), styled like `Card`'s info panel but slightly more compact (smaller font, tighter padding) to suit the smaller card.
- The card's `minHeight` should stay the same; the info panel adds height when expanded — that's expected.

#### 2. Info text per card

Wording matches the user-friendly tone of the existing `Card` info popups (no internal field names like `completedAt`).

**Current Queue Status** — all five describe active issues only:

| Card | Info text |
|---|---|
| Guidance Queue | "Open issues currently labeled with the Guidance Queue label. Excludes all closed statuses (Done, Merged, Cancelled, Parking Lot, Roadmap)." |
| Support Queue | Same pattern for Support Queue label. |
| COE Queue | Same pattern for COE Queue label. |
| Admin Queue | Same pattern for Admin Queue label. |
| Triage | "Open issues with no queue label assigned yet. Excludes all closed statuses." |

**This Month** — date range is the 1st of this month at 00:00 through now:

| Card | Info text |
|---|---|
| Opened | "Issues created since the 1st of this month, regardless of current status." |
| Closed | "Issues moved to any closed status (Done, Merged, Cancelled, Parking Lot, Roadmap) since the 1st of this month, based on when the issue was moved to a closed status." |
| Completed | "Issues marked Done or Merged since the 1st of this month. A subset of Closed." |

**Last Month** — date range is the 1st through the last day of last month:

| Card | Info text |
|---|---|
| Opened | "Issues created during last month (the 1st through the last day)." |
| Closed | "Issues moved to any closed status (Done, Merged, Cancelled, Parking Lot, Roadmap) during last month, based on when the issue was moved to a closed status." |
| Completed | "Issues marked Done or Merged during last month. A subset of Closed." |

#### 3. Wire `info` props at the call sites

- Current Queue Status (loop at [FurnitureBankDashboard.jsx:950-959](../../../src/FurnitureBankDashboard.jsx#L950-L959)): map each queue key to its info string via a new `QUEUE_INFO` constant or inline lookup.
- This Month ([FurnitureBankDashboard.jsx:980-985](../../../src/FurnitureBankDashboard.jsx#L980-L985)): pass the three strings directly.
- Last Month ([FurnitureBankDashboard.jsx:1117-1122](../../../src/FurnitureBankDashboard.jsx#L1117-L1122)): pass the three strings directly.

### Out of scope

- No restyle of `StatCard`'s closed state.
- No equivalent on `BarChart` / `DonutChart` cards (those already use `Card` with `info`).
- No info text for the "All-Time Queue History" or "Trends (12 Months)" sections — already covered by `Card` info props.

---

## Files Touched

- `api/linear.js` — extend GraphQL query, pass full creator object.
- `src/FurnitureBankDashboard.jsx` — `StatCard` info support, creator normalization + label fallback, debug-gated diagnostic panel, info strings on all 11 cards.

## Testing

- Manual: load the dashboard, verify the 11 info icons appear and toggle correctly.
- Manual: load `?debug=1`, verify the diagnostic panel appears under the creator donut and the numbers add up to the total issue count.
- Manual: load without `?debug=1`, verify the dashboard looks identical to today.
- Manual: click drill-down on a creator slice, verify the issue list still matches.
- Type/build check: `npm run build` succeeds.
