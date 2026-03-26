export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

  if (!LINEAR_API_KEY) {
    return res.status(500).json({ error: 'Linear API key not configured' });
  }

  const QUEUE_LABELS = ["Guidance Queue", "Support Queue", "COE Queue", "Admin Queue", "Sorting Hat"];

  async function linearQuery(query, variables = {}) {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY,
      },
      body: JSON.stringify({ query, variables }),
    });
    return response.json();
  }

  try {
    const query = `
      query($cursor: String) {
        issues(first: 100, after: $cursor, orderBy: updatedAt) {
          pageInfo { hasNextPage endCursor }
          nodes {
            identifier
            title
            url
            completedAt
            state { name }
            labels { nodes { name } }
            history(first: 50) {
              nodes {
                createdAt
                addedLabels { id name }
              }
            }
          }
        }
      }
    `;

    // Track per-label: Map<identifier, { ...issue, labelAddedAt }>
    const everHadLabel = {};
    QUEUE_LABELS.forEach((l) => (everHadLabel[l] = new Map()));

    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const result = await linearQuery(query, { cursor });

      if (result.errors) {
        return res.status(500).json({ error: 'Linear API error', details: result.errors });
      }

      const nodes = result.data?.issues?.nodes || [];

      for (const issue of nodes) {
        const historyEntries = issue.history?.nodes || [];
        const currentLabels = (issue.labels?.nodes || []).map(l => l.name);

        for (const entry of historyEntries) {
          const added = entry.addedLabels || [];
          for (const label of added) {
            if (QUEUE_LABELS.includes(label.name)) {
              const existing = everHadLabel[label.name].get(issue.identifier);
              const entryDate = entry.createdAt;
              // Keep the earliest addedAt date
              if (!existing || (entryDate && (!existing.labelAddedAt || entryDate < existing.labelAddedAt))) {
                everHadLabel[label.name].set(issue.identifier, {
                  identifier: issue.identifier,
                  title: issue.title,
                  url: issue.url,
                  status: issue.state?.name || 'Unknown',
                  completedAt: issue.completedAt || null,
                  stillHasLabel: currentLabels.includes(label.name),
                  labelAddedAt: entryDate || null,
                });
              }
            }
          }
        }

        // Also count issues that currently have the label
        for (const labelName of currentLabels) {
          if (QUEUE_LABELS.includes(labelName) && !everHadLabel[labelName].has(issue.identifier)) {
            everHadLabel[labelName].set(issue.identifier, {
              identifier: issue.identifier,
              title: issue.title,
              url: issue.url,
              status: issue.state?.name || 'Unknown',
              completedAt: issue.completedAt || null,
              stillHasLabel: true,
              labelAddedAt: null,
            });
          }
        }
      }

      hasNextPage = result.data?.issues?.pageInfo?.hasNextPage || false;
      cursor = result.data?.issues?.pageInfo?.endCursor || null;
    }

    const responseData = {};
    for (const labelName of QUEUE_LABELS) {
      const issues = Array.from(everHadLabel[labelName].values());
      responseData[labelName] = {
        totalEverHad: issues.length,
        stillHasLabel: issues.filter((i) => i.stillHasLabel).length,
        removed: issues.filter((i) => !i.stillHasLabel).length,
        issues: issues,
      };
    }

    return res.status(200).json({ labelHistory: responseData });
  } catch (error) {
    console.error('Error fetching label history:', error);
    return res.status(500).json({ error: 'Failed to fetch label history', message: error.message });
  }
}
