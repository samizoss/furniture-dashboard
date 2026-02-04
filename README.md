# Furniture Bank Linear Dashboard

A real-time dashboard that displays issues from your Linear workspace with auto-refresh, charts, and clickable links.

**Live Site:** https://furniture-dashboard-delta.vercel.app/

---

## Table of Contents

1. [What This Does](#what-this-does)
2. [How It Works](#how-it-works)
3. [Setup From Scratch](#setup-from-scratch)
4. [Making Changes](#making-changes)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)
7. [File Structure](#file-structure)

---

## What This Does

- Pulls issues from Linear automatically (no manual input needed)
- Auto-refreshes every 60 seconds (configurable)
- Shows issues organized by queue, department, priority, and team
- Displays charts: donut charts, bar charts, and 6-month trends
- Click any issue to open it directly in Linear
- Hosted free on Vercel

---

## How It Works

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Your Browser   │ ───► │  Vercel (API)   │ ───► │  Linear API     │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │
        │   React Dashboard      │   /api/linear.js
        │   (frontend)           │   (serverless function)
        │                        │
        └────────────────────────┘
```

1. The React dashboard loads in your browser
2. It calls `/api/linear` (a serverless function on Vercel)
3. The serverless function uses your Linear API key to fetch issues
4. Data is returned to the dashboard and displayed

---

## Setup From Scratch

If you need to recreate this from zero:

### Step 1: Get a Linear API Key

1. Go to [Linear](https://linear.app)
2. Click your profile → **Settings**
3. Go to **API** → **Personal API keys**
4. Click **Create key**, give it a name, and copy the key
5. It looks like: `lin_api_XXXXXXXXXXXXXXXXXXXXXXXXXXXX`

### Step 2: Clone the Repository

```bash
git clone https://github.com/samizoss/furniture-dashboard.git
cd furniture-dashboard
npm install
```

### Step 3: Run Locally (Optional)

To test locally, create a `.env` file:

```
LINEAR_API_KEY=lin_api_YOUR_KEY_HERE
```

Then run:

```bash
npm run dev
```

Open http://localhost:5173

### Step 4: Deploy to Vercel

**Option A: Via Vercel Website (Easiest)**

1. Go to https://vercel.com/new
2. Click **Import Git Repository**
3. Select `furniture-dashboard`
4. Before deploying, add Environment Variable:
   - Name: `LINEAR_API_KEY`
   - Value: `lin_api_YOUR_KEY_HERE`
5. Click **Deploy**

**Option B: Via Command Line**

```bash
npm install -g vercel
vercel login
vercel --prod
# When prompted, add LINEAR_API_KEY as an environment variable
```

---

## Making Changes

### Edit the Dashboard Locally

```bash
cd furniture-dashboard
npm install
npm run dev
```

Make your changes, then push to GitHub:

```bash
git add .
git commit -m "Your change description"
git push
```

Vercel will automatically redeploy when you push to GitHub.

### Key Files to Edit

| File | What It Does |
|------|--------------|
| `src/FurnitureBankDashboard.jsx` | Main dashboard UI, charts, colors, layout |
| `api/linear.js` | Fetches data from Linear API |
| `src/index.css` | Global styles |

### Change Colors

Edit the `BRAND` object at the top of `FurnitureBankDashboard.jsx`:

```javascript
const BRAND = {
  bg: "#0c1017",           // Background color
  surface: "#131a24",       // Card background
  accent: "#38bdf8",        // Primary accent (blue)
  success: "#34d399",       // Green
  warning: "#fbbf24",       // Yellow
  danger: "#f87171",        // Red
  // ... etc
};
```

### Change Queue Names/Colors

Edit `QUEUE_CONFIG`:

```javascript
const QUEUE_CONFIG = {
  "Guidance Queue": { color: "#38bdf8", short: "Guidance Queue", icon: "◆" },
  "Support Queue": { color: "#fb923c", short: "Support Queue", icon: "▲" },
  // Add or modify queues here
};
```

### Change How Many Issues Load

Edit `api/linear.js`, change `first: 100` to your desired number:

```javascript
const query = `
  query {
    issues(first: 100, orderBy: updatedAt) {  // ← Change 100 to desired amount
      ...
    }
  }
`;
```

**Note:** Linear has query complexity limits. If you get errors, reduce the number.

### Change Auto-Refresh Interval

In `FurnitureBankDashboard.jsx`, find:

```javascript
const [refreshInterval, setRefreshInterval] = useState(60);
```

Change `60` to your desired seconds (e.g., `30` for 30 seconds).

---

## Configuration

### Environment Variables (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `LINEAR_API_KEY` | Yes | Your Linear personal API key |

**To update the API key on Vercel:**

1. Go to https://vercel.com/dashboard
2. Click on `furniture-dashboard`
3. Go to **Settings** → **Environment Variables**
4. Update `LINEAR_API_KEY`
5. Click **Redeploy** (from Deployments tab) to apply

---

## Troubleshooting

### "Connection Issue" Error

1. **Check API Key:** Make sure `LINEAR_API_KEY` is set correctly in Vercel
2. **Redeploy:** Go to Vercel → Deployments → click "..." on latest → Redeploy
3. **Test API directly:** Visit `https://furniture-dashboard-delta.vercel.app/api/linear` - you should see JSON data

### "Query too complex" Error

Linear limits how much data you can fetch at once. In `api/linear.js`, reduce:

```javascript
issues(first: 100, ...)  // Try reducing to 50 or 25
```

### Changes Not Showing Up

1. **Hard refresh:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Check deployment:** Go to Vercel dashboard and verify deployment succeeded
3. **Check GitHub:** Make sure your `git push` succeeded

### Dashboard Shows No Data

1. Check if your Linear workspace actually has issues
2. Verify API key has access to the teams/issues
3. Check browser console (F12) for errors

---

## File Structure

```
furniture-dashboard/
├── api/
│   └── linear.js              # Serverless function - fetches from Linear
├── public/
│   └── favicon.svg            # Browser tab icon
├── src/
│   ├── App.jsx                # App wrapper (just imports dashboard)
│   ├── FurnitureBankDashboard.jsx  # MAIN FILE - all dashboard code
│   ├── index.css              # Global styles
│   └── main.jsx               # React entry point
├── .gitignore                 # Files to ignore in git
├── index.html                 # HTML template
├── package.json               # Dependencies and scripts
├── README.md                  # This file
├── vercel.json                # Vercel configuration
└── vite.config.js             # Vite build configuration
```

---

## Useful Commands

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Check git status
git status

# Push changes
git add . && git commit -m "message" && git push
```

---

## Links

- **Live Dashboard:** https://furniture-dashboard-delta.vercel.app/
- **GitHub Repo:** https://github.com/samizoss/furniture-dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Linear API Docs:** https://developers.linear.app/docs/graphql/working-with-the-graphql-api

---

## Need Help?

If something breaks:

1. Check [Troubleshooting](#troubleshooting) above
2. Look at Vercel deployment logs for errors
3. Check browser console (F12 → Console tab) for frontend errors
4. Verify your Linear API key is valid and has proper permissions
