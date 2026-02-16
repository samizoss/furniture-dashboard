export default async function handler(req, res) {
  // CORS headers
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

  try {
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
            creator { email }
            assignee { email }
          }
        }
      }
    `;

    let allIssues = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage) {
      const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': LINEAR_API_KEY,
        },
        body: JSON.stringify({ query, variables: { cursor } }),
      });

      const data = await response.json();

      if (data.errors) {
        console.error('Linear API errors:', data.errors);
        return res.status(500).json({ error: 'Linear API error', details: data.errors });
      }

      const nodes = data.data?.issues?.nodes || [];
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
        creator: issue.creator?.email || null,
        assignee: issue.assignee?.email || null,
      })));

      hasNextPage = data.data?.issues?.pageInfo?.hasNextPage || false;
      cursor = data.data?.issues?.pageInfo?.endCursor || null;
    }

    return res.status(200).json(allIssues);
  } catch (error) {
    console.error('Error fetching from Linear:', error);
    return res.status(500).json({ error: 'Failed to fetch from Linear', message: error.message });
  }
}
