# Furniture Bank Dashboard

A React dashboard for visualizing Linear issues with real-time data fetching.

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Deploy to GitHub Pages (Free)

### 1. Create GitHub Repository

```bash
cd furniture-dashboard
git init
git add .
git commit -m "Initial commit"
```

Go to GitHub and create a new repository named `furniture-dashboard`, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/furniture-dashboard.git
git branch -M main
git push -u origin main
```

### 2. Update Base Path

Edit `vite.config.js` and change the `base` to match your repo name:

```js
base: '/furniture-dashboard/'
```

### 3. Deploy

```bash
npm run deploy
```

Your dashboard will be live at: `https://YOUR_USERNAME.github.io/furniture-dashboard/`

## Features

- **URL Input**: Enter any API endpoint to fetch issue data
- **Auto-Refresh**: Enable real-time updates (5s to 5min intervals)
- **Team Filtering**: Filter by team
- **Queue Views**: Filter by queue type
- **Charts**: Donut charts, bar charts, and trend visualizations
- **Responsive**: Works on desktop and mobile

## Data Format

The dashboard accepts JSON in these formats:

```json
// Direct array
[
  {
    "identifier": "DG-123",
    "title": "Issue title",
    "status": "In Progress",
    "priority": 2,
    "labels": ["Support Queue", "IT/Technology"],
    "project": "Project Name",
    "team": "Guidance Team",
    "createdAt": "2026-01-29T15:00:00Z",
    "completedAt": null,
    "creator": "user@example.com",
    "assignee": "user@example.com"
  }
]

// Or wrapped
{ "issues": [...] }
{ "data": [...] }
```

## Linear API Integration

To connect to Linear, you can:

1. Use Linear's GraphQL API via a serverless function
2. Set up Linear's MCP server
3. Use a proxy that exposes Linear data as JSON

Example Vercel serverless function for Linear:

```js
// api/linear.js
export default async function handler(req, res) {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': process.env.LINEAR_API_KEY,
    },
    body: JSON.stringify({
      query: `{ issues { nodes { identifier title state { name } priority labels { nodes { name } } } } }`
    }),
  });
  const data = await response.json();
  res.json(data.data.issues.nodes);
}
```

## License

MIT
