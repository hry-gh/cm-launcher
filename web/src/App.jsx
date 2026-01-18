import { useEffect, useState } from 'react'

const GAME_STATES = {
  0: "Starting",
  1: "Lobby",
  2: "Setting Up",
  3: "Playing",
  4: "Finished"
}

function formatDuration(deciseconds) {
  if (!deciseconds) return "--:--:--"
  const totalSeconds = Math.floor(deciseconds / 10)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function ServerItem({ server }) {
  const handleConnect = () => {
    // Placeholder for connect functionality
    console.log(`Connecting to ${server.name}...`)
  }

  const isOnline = server.status === "available"
  const data = server.data

  return (
    <div className="server-item">
      <div className="server-info">
        <div className="server-name">{server.name}</div>
        {isOnline && data ? (
          <div className="server-details">
            <span>Round #{data.round_id}</span>
            <span>{data.mode}</span>
            <span>{data.map_name}</span>
            <span>{formatDuration(data.round_duration)}</span>
            <span>{GAME_STATES[data.gamestate] || "Unknown"}</span>
          </div>
        ) : (
          <div className="server-details">
            <span>Server unavailable</span>
          </div>
        )}
      </div>
      <div className="server-status">
        <div className={`status-indicator ${!isOnline ? 'offline' : ''}`} />
        <div className="player-count">
          {isOnline && data ? data.players : "--"}
        </div>
        <button
          type="button"
          className="button"
          onClick={handleConnect}
          disabled={!isOnline}
        >
          Connect
        </button>
      </div>
    </div>
  )
}

function Titlebar() {
  const handleMinimize = () => {
    BYOND.winset("main", { "is-minimized": "true" })
  }

  const handleClose = () => {
    BYOND.command(".quit")
  }

  return (
    <div className="titlebar">
      <div className="titlebar-title">CM-SS13 Launcher</div>
      <div className="titlebar-buttons">
        <button type="button" className="titlebar-button" onClick={handleMinimize}>
          <span className="titlebar-icon">−</span>
        </button>
        <button type="button" className="titlebar-button titlebar-close" onClick={handleClose}>
          <span className="titlebar-icon">×</span>
        </button>
      </div>
    </div>
  )
}

function App() {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const adjustForDPI = async () => {
      const dpi = window.devicePixelRatio
      const { size } = await BYOND.winget("main", "size")

      const newWidth = Math.round(size.x * dpi)
      const newHeight = Math.round(size.y * dpi)

      const screenWidth = window.screen.width * dpi
      const screenHeight = window.screen.height * dpi
      const posX = Math.round((screenWidth - newWidth) / 2)
      const posY = Math.round((screenHeight - newHeight) / 2)

      await BYOND.winset("main", {
        "size": `${newWidth}x${newHeight}`,
        "pos": `${posX},${posY}`
      })
    }

    adjustForDPI()
  }, [])

  useEffect(() => {
    const fetchServers = async () => {
      try {
        setLoading(true)
        const response = await fetch("https://db.cm-ss13.com/api/Round")
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`)
        }
        const data = await response.json()
        setServers(data.servers || [])
        setError(null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchServers()
    const interval = setInterval(fetchServers, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* CRT Overlay Effect */}
      <div className="crt" />

      <div className="launcher">
        {/* Titlebar */}
        <Titlebar />

        {/* Main Content - Server List */}
        <main className="main-content">
          <section className="section">
            <div className="section-header">Available Servers</div>
            <div className="server-list">
              {loading && servers.length === 0 && (
                <div className="server-loading">Loading servers...</div>
              )}
              {error && (
                <div className="server-error">Error: {error}</div>
              )}
              {servers.map((server, index) => (
                <ServerItem key={server.name || index} server={server} />
              ))}
            </div>
          </section>
        </main>

        {/* Footer - Account Info */}
        <footer className="section footer">
          <div className="account-info">
            <div className="account-avatar">CM</div>
            <div className="account-details">
              <div className="account-name">Placeholder_User</div>
              <div className="account-status">BYOND Account Connected</div>
            </div>
          </div>
          <div className="footer-actions">
            <button type="button" className="button-secondary">Settings</button>
            <button type="button" className="button-secondary">Logout</button>
          </div>
        </footer>
      </div>
    </>
  )
}

export default App
