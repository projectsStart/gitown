import './App.css'

import { useEffect, useState } from 'react'

type TileType = 'grass' | 'path' | 'house'

type Tile = {
  id: number
  type: TileType
  commit?: CommitInfo
}

type CommitInfo = {
  sha: string
  message: string
  authorName: string
  url: string
  date: string
}

const GRID_SIZE = 10

const STARTER_HOUSES = [12, 17, 66, 73]

const createBaseTown = (): Tile[] => {
  const mid = Math.floor(GRID_SIZE / 2)
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
    const isPath = i % GRID_SIZE === mid
    const isStarterHouse = STARTER_HOUSES.includes(i)
    const type: TileType = isStarterHouse ? 'house' : isPath ? 'path' : 'grass'
    return {
      id: i,
      type,
    }
  })
}

const baseGrid: Tile[] = createBaseTown()

// Configure your GitHub repo here
const GITHUB_OWNER = 'projectsStart'
const GITHUB_REPO = 'gitown'

function App() {
  const [grid, setGrid] = useState<Tile[]>(() => createBaseTown())
  const [commits, setCommits] = useState<CommitInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<CommitInfo | null>(null)

  useEffect(() => {
    fetchCommits()
  }, [])

  const fetchCommits = async () => {
    if (!GITHUB_OWNER || !GITHUB_REPO) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=80`,
      )
      if (!res.ok) {
        throw new Error(`GitHub error: ${res.status}`)
      }
      const data = await res.json()
      const mapped: CommitInfo[] = data.map((item: any) => ({
        sha: item.sha,
        message: item.commit?.message ?? 'No message',
        authorName:
          item.commit?.author?.name ??
          item.author?.login ??
          'Unknown author',
        url: item.html_url,
        date: item.commit?.author?.date ?? '',
      }))

      setCommits(mapped)

      const buildOrder = baseGrid
        .filter((t) => t.type === 'grass')
        .map((t) => t.id)

      const nextGrid = createBaseTown()

      mapped.slice(0, buildOrder.length).forEach((commit, index) => {
        const tileId = buildOrder[index]
        const tileIndex = nextGrid.findIndex((t) => t.id === tileId)
        if (tileIndex >= 0) {
          nextGrid[tileIndex] = {
            ...nextGrid[tileIndex],
            type: 'house',
            commit,
          }
        }
      })

      setGrid(nextGrid)
    } catch (err: any) {
      setError(err.message ?? 'Failed to load commits')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      <section className="hero">
        <div className="hero-video-frame">
          <video
            className="hero-video"
            src="/v1.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="hero-glow" />
        </div>
        <header className="hero-text">
          <div className="hero-topbar">
            <div className="hero-title-block">
              <h1 className="title">GITOWN</h1>
              <p className="subtitle">
                A living pixel village where every commit becomes a new house.
              </p>
              <p className="meta">
                Point this demo to your GitHub repo and let your contributors
                build the town together.
              </p>
            </div>
            <div className="social-buttons">
              <a
                href="https://x.com/Gitown_"
                target="_blank"
                rel="noreferrer"
                className="social-button social-x"
              >
                X
              </a>
              <a
                href="https://github.com/projectsStart/gitown"
                target="_blank"
                rel="noreferrer"
                className="social-button social-git"
              >
                GIT
              </a>
            </div>
          </div>
        </header>
      </section>

      <main className="layout">
        <section className="panel panel-town">
          <div className="panel-header">
            <h2 className="panel-title">Town map</h2>
            <p className="panel-caption">
              Each house represents a recent commit. Hover to see who built it.
            </p>
          </div>
          <div className="town-grid">
            {grid.map((tile) => (
              <button
                key={tile.id}
                type="button"
                className={`tile tile-${tile.type}`}
                title={
                  tile.commit
                    ? `${tile.commit.authorName}: ${tile.commit.message}`
                    : undefined
                }
                onClick={() => {
                  if (tile.commit) {
                    setSelectedCommit(tile.commit)
                  }
                }}
              >
                {tile.type === 'house' && tile.commit && (
                  <div className="house-label">
                    <span className="house-name">
                      {tile.commit.authorName}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
          {selectedCommit && (
            <div className="selected-commit">
              <div className="selected-commit-header">
                <span className="selected-commit-label">Selected house</span>
                <button
                  type="button"
                  className="selected-commit-close"
                  onClick={() => setSelectedCommit(null)}
                >
                  ×
                </button>
              </div>
              <p className="selected-commit-author">{selectedCommit.authorName}</p>
              <p className="selected-commit-message">{selectedCommit.message}</p>
              <a
                href={selectedCommit.url}
                target="_blank"
                rel="noreferrer"
                className="selected-commit-link"
              >
                View commit on GitHub
              </a>
            </div>
          )}
        </section>

        <section className="panel panel-commit">
          <div className="panel-header">
            <h2 className="panel-title">Live from your repo</h2>
            <p className="panel-caption">
              Configure your GitHub repo in the code and pull the latest
              commits into the town.
            </p>
          </div>
          <div className="commit-form">
            <button
              className="button"
              type="button"
              onClick={fetchCommits}
              disabled={isLoading}
            >
              {isLoading ? 'Syncing…' : 'Sync commits'}
            </button>
            <p className="hint">
              Edit <code>GITHUB_OWNER</code> and <code>GITHUB_REPO</code> in{' '}
              <code>App.tsx</code> to point at your project. New commits will
              appear as new houses.
            </p>
            {error && <p className="error-text">Error: {error}</p>}
          </div>

          <div className="history">
            <h3 className="history-title">Recent commits</h3>
            {commits.length === 0 ? (
              <p className="history-empty">
                No commits loaded yet. Sync to populate the village.
              </p>
            ) : (
              <ul className="history-list">
                {commits.slice(0, 15).map((c) => (
                  <li key={c.sha} className="history-item">
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="commit-link"
                    >
                      <span className="commit-author">{c.authorName}</span>
                      <span className="commit-message">{c.message}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
