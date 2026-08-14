import { useState, useEffect } from 'react'

function Login({ onLogin }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (!res.ok) {
        throw new Error('Invalid credentials')
      }
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
      <div className="glass-panel animate-in" style={{ padding: '2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--accent-color)' }}>ZeroClaw Hub</h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Username</label>
            <input 
              className="input-field"
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Password</label>
            <input 
              className="input-field"
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p style={{ color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Dashboard({ onLogout }) {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/v1/ui/queue')
      if (res.status === 401) {
        onLogout()
        return
      }
      const data = await res.json()
      setQueue(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleAction = async (id, action) => {
    try {
      await fetch(`/api/v1/ui/queue/${id}/${action}`, { method: 'POST' })
      setQueue(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' })
    onLogout()
  }

  return (
    <>
      <nav className="nav-bar">
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>ZeroClaw Analyst Control Plane</h2>
        <button onClick={handleLogout} className="btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
          Sign Out
        </button>
      </nav>
      
      <main className="container animate-in">
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>Threat Review Queue</h3>
            <span className="badge" style={{ background: 'rgba(59,130,246,0.2)', color: 'var(--accent-color)' }}>
              {queue.length} Pending
            </span>
          </div>

          {loading ? (
            <p>Loading queue...</p>
          ) : queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              <p>Queue is empty. No threats awaiting review.</p>
            </div>
          ) : (
            <table className="threat-table">
              <thead>
                <tr>
                  <th>Client Node</th>
                  <th>Indicator Name</th>
                  <th>Pattern</th>
                  <th>Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queue.map(threat => (
                  <tr key={threat.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{threat.client.cn}</span>
                        {threat.client.is_quarantined && (
                          <span className="badge badge-quarantined">Quarantined</span>
                        )}
                      </div>
                    </td>
                    <td>{threat.stix_data.name}</td>
                    <td><code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{threat.stix_data.pattern}</code></td>
                    <td>{new Date(threat.created_at).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleAction(threat.id, 'approve')} className="btn btn-success" style={{ padding: '0.5rem 1rem' }}>Approve</button>
                        <button onClick={() => handleAction(threat.id, 'reject')} className="btn btn-danger" style={{ padding: '0.5rem 1rem' }}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Simple check based on cookie existence is handled by Dashboard 401 response
  return isAuthenticated ? (
    <Dashboard onLogout={() => setIsAuthenticated(false)} />
  ) : (
    <Login onLogin={() => setIsAuthenticated(true)} />
  )
}

export default App
