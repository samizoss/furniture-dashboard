import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'api-linear',
        configureServer(server) {
          server.middlewares.use('/api/linear', async (req, res) => {
            const LINEAR_API_KEY = env.LINEAR_API_KEY
            if (!LINEAR_API_KEY) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Linear API key not configured' }))
              return
            }

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
            `

            try {
              let allIssues = []
              let hasNextPage = true
              let cursor = null

              while (hasNextPage) {
                const response = await fetch('https://api.linear.app/graphql', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': LINEAR_API_KEY,
                  },
                  body: JSON.stringify({ query, variables: { cursor } }),
                })

                const data = await response.json()

                if (data.errors) {
                  res.writeHead(500, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'Linear API error', details: data.errors }))
                  return
                }

                const nodes = data.data?.issues?.nodes || []
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
                })))

                hasNextPage = data.data?.issues?.pageInfo?.hasNextPage || false
                cursor = data.data?.issues?.pageInfo?.endCursor || null
              }

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify(allIssues))
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Failed to fetch from Linear', message: error.message }))
            }
          })
        },
      },
      {
        name: 'api-label-history',
        configureServer(server) {
          server.middlewares.use('/api/label-history', async (req, res) => {
            const LINEAR_API_KEY = env.LINEAR_API_KEY
            if (!LINEAR_API_KEY) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Linear API key not configured' }))
              return
            }

            const QUEUE_LABELS = ["Guidance Queue", "Support Queue", "COE Queue", "Admin Queue", "Sorting Hat"]

            async function linearQuery(query, variables = {}) {
              const response = await fetch('https://api.linear.app/graphql', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': LINEAR_API_KEY,
                },
                body: JSON.stringify({ query, variables }),
              })
              return response.json()
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
              `

              const everHadLabel = {}
              QUEUE_LABELS.forEach((l) => (everHadLabel[l] = new Map()))

              let hasNextPage = true
              let cursor = null

              while (hasNextPage) {
                const result = await linearQuery(query, { cursor })

                if (result.errors) {
                  res.writeHead(500, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'Linear API error', details: result.errors }))
                  return
                }

                const nodes = result.data?.issues?.nodes || []

                for (const issue of nodes) {
                  const historyEntries = issue.history?.nodes || []
                  const currentLabels = (issue.labels?.nodes || []).map(l => l.name)

                  for (const entry of historyEntries) {
                    const added = entry.addedLabels || []
                    for (const label of added) {
                      if (QUEUE_LABELS.includes(label.name)) {
                        const existing = everHadLabel[label.name].get(issue.identifier)
                        const entryDate = entry.createdAt
                        if (!existing || (entryDate && (!existing.labelAddedAt || entryDate < existing.labelAddedAt))) {
                          everHadLabel[label.name].set(issue.identifier, {
                            identifier: issue.identifier,
                            title: issue.title,
                            url: issue.url,
                            status: issue.state?.name || 'Unknown',
                            completedAt: issue.completedAt || null,
                            stillHasLabel: currentLabels.includes(label.name),
                            labelAddedAt: entryDate || null,
                          })
                        }
                      }
                    }
                  }

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
                      })
                    }
                  }
                }

                hasNextPage = result.data?.issues?.pageInfo?.hasNextPage || false
                cursor = result.data?.issues?.pageInfo?.endCursor || null
              }

              const responseData = {}
              for (const labelName of QUEUE_LABELS) {
                const issues = Array.from(everHadLabel[labelName].values())
                responseData[labelName] = {
                  totalEverHad: issues.length,
                  stillHasLabel: issues.filter((i) => i.stillHasLabel).length,
                  removed: issues.filter((i) => !i.stillHasLabel).length,
                  issues: issues,
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ labelHistory: responseData }))
            } catch (error) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Failed to fetch label history', message: error.message }))
            }
          })
        },
      },
    ],
  }
})
