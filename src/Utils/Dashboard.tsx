import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [contacts, setContacts] = useState<Array<{ name: string; email: string; role: string }>>([])
  const [results, setResults] = useState<Array<{ name: string; email: string; role: string }>>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState<null | { name: string; email: string; role: string }>(null)
  const [messages, setMessages] = useState<Array<{ _id?: string; clientId?: string; from: string; to?: string; text: string; time: string }>>([])
  const [newMessage, setNewMessage] = useState('')
  const [notification, setNotification] = useState('')
  const [notificationVisible, setNotificationVisible] = useState(false)
  const [notificationPeer, setNotificationPeer] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const selectedUserRef = useRef<{ name: string; email: string; role: string } | null>(null)
  const messageIdsRef = useRef<Set<string>>(new Set())
  const navigate = useNavigate()

  const getMessageKey = (msg: { _id?: string; clientId?: string; from: string; to?: string; text: string; time: string }) => {
    if (msg.clientId) return msg.clientId
    if (msg._id) return msg._id
    return `${msg.from}|${msg.to || ''}|${msg.text}|${msg.time}`
  }

  const appendMessageIfNew = (msg: { _id?: string; from: string; to?: string; text: string; time: string }) => {
    const key = getMessageKey(msg)
    if (messageIdsRef.current.has(key)) return false
    messageIdsRef.current.add(key)
    setMessages((prev) => [...prev, msg])
    return true
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    navigate('/login')
  }

  const handleRefreshSession = () => {
    const email = currentUserEmail
    if (!email) return
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    localStorage.setItem('token', 'logged-in')
    localStorage.setItem('email', email)
    window.location.reload()
  }

  const currentUserEmail = localStorage.getItem('email')?.trim().toLowerCase() || ''

  const fetchUsers = async (searchText: string = '') => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`http://localhost:4000/users${searchText ? `?search=${encodeURIComponent(searchText)}` : ''}`)
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load users')
      }
      const filtered = Array.isArray(data.users) ? data.users.filter((u: any) => u.email !== currentUserEmail) : []
      setContacts(filtered)
      setResults(filtered)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load users')
      setContacts([])
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectUser = (user: { name: string; email: string; role: string }) => {
    const normalizedUser = { ...user, email: user.email.trim().toLowerCase() }
    selectedUserRef.current = normalizedUser
    setSelectedUser(normalizedUser)
    fetchConversation(normalizedUser.email)
  }

  const showNotification = (title: string, body: string, peerEmail: string | null = null) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, silent: false })
    }
    setNotification(`${title}: ${body}`)
    setNotificationPeer(peerEmail)
    setNotificationVisible(true)
    window.setTimeout(() => setNotificationVisible(false), 5000)
  }

  const handleNotificationClick = () => {
    if (!notificationPeer) {
      setNotificationVisible(false)
      return
    }

    const peer = results.find((u) => u.email === notificationPeer) || {
      name: notificationPeer,
      email: notificationPeer,
      role: 'user'
    }

    setSelectedUser(peer)
    fetchConversation(peer.email)
    setNotificationVisible(false)
  }

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  const fetchConversation = async (peerEmail: string) => {
    if (!currentUserEmail) return
    try {
      const res = await fetch(`http://localhost:4000/messages?user=${encodeURIComponent(currentUserEmail)}&peer=${encodeURIComponent(peerEmail)}`)
      const msgs = await res.json()
      if (!res.ok) throw new Error(msgs.error || 'Failed to load messages')
      setMessages(msgs || [])
    } catch (err) {
      console.error('fetchConversation error', err)
      setMessages([])
    }
  }

  useEffect(() => {
    selectedUserRef.current = selectedUser
    messageIdsRef.current = new Set(messages.map(getMessageKey))
  }, [selectedUser, messages])

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    const s = io('http://localhost:4000', {
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    })
    socketRef.current = s

    const join = () => {
      const me = localStorage.getItem('email')?.trim().toLowerCase()
      if (me) {
        s.emit('join', me)
        console.log('joining room', me)
      }
    }

    const handleIncomingMessage = async (msg: any) => {
      const me = localStorage.getItem('email')?.trim().toLowerCase()
      if (!me) return

      const from = String(msg.from || '').trim().toLowerCase()
      const to = String(msg.to || '').trim().toLowerCase()
      const senderEmail = from === me ? to : from
      const isIncoming = to === me && from !== me
      const currentPeer = selectedUserRef.current?.email?.trim().toLowerCase()
      const messageBelongsToCurrentChat = currentPeer ? senderEmail === currentPeer : false

      if (messageBelongsToCurrentChat) {
        appendMessageIfNew(msg)
        if (isIncoming) {
          const senderName = results.find((u) => u.email === from)?.name || msg.from
          showNotification('New message received', `${senderName}: ${msg.text}`, senderEmail)
          if (currentPeer) await fetchConversation(currentPeer)
        }
      } else if (isIncoming) {
        const senderName = results.find((u) => u.email === msg.from)?.name || msg.from
        showNotification('New message received', `${senderName}: ${msg.text}`, senderEmail)
      }
    }

    s.on('connect', () => {
      console.log('socket connected', s.id)
      join()
    })

    s.on('connect_error', (error) => {
      console.error('Socket connect error:', error)
    })

    s.on('disconnect', (reason) => {
      console.log('socket disconnected', reason)
    })

    s.on('new_message', handleIncomingMessage)

    join()

    return () => {
      s.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (socketRef.current && currentUserEmail) {
      socketRef.current.emit('join', currentUserEmail)
    }
  }, [currentUserEmail])

  const handleSearch = () => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      setResults(contacts)
      return
    }

    setResults(contacts.filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)))
  }

  const visibleResults = results.filter((user) => user.email !== currentUserEmail)

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <h2>Contacts</h2>
        <div className="sidebar-search">
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="button" onClick={handleSearch}>Search</button>
        </div>

        {error && <p className="sidebar-error">{error}</p>}
        {loading && <p className="sidebar-loading">Loading contacts...</p>}

        <div className="sidebar-actions">
          <button type="button" onClick={() => { setSearchQuery(''); setResults(contacts) }} className="sidebar-action-button">Reset</button>
          <button type="button" onClick={() => fetchUsers()} className="sidebar-action-button">Refresh contacts</button>
          <button type="button" onClick={handleRefreshSession} className="sidebar-action-button">Refresh session</button>
        </div>

        <ul className="search-results">
          {visibleResults.length === 0 && !loading && <li className="search-empty">No people found.</li>}
          {visibleResults.map((user) => (
            <li
              key={user.email}
              className={`search-item ${selectedUser?.email === user.email ? 'active' : ''}`}
              onClick={() => handleSelectUser(user)}
              style={{ cursor: 'pointer' }}
            >
              <strong>{user.name}</strong>
              <p>{user.email}</p>
              <span>{user.role}</span>
            </li>
          ))}
        </ul>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <button className="dashboard-logout" onClick={handleLogout}>Logout</button>
        </div>
        {notificationVisible && (
          <div className="notification-toast" onClick={handleNotificationClick}>
            {notification}
          </div>
        )}
        {!selectedUser ? (
          <p>Use the sidebar to search for people on the server. Click a user to start chat.</p>
        ) : (
          <div className="chat-window">
            <div className="chat-header">
              <h2>{selectedUser.name}</h2>
              <p className="chat-sub">{selectedUser.email} • {selectedUser.role}</p>
            </div>

            <div className="messages">
              {messages.length === 0 && <p className="chat-empty">No messages yet. Say hello!</p>}
              {messages.map((m, i) => (
                <div key={i} className={`message ${m.from === currentUserEmail ? 'me' : 'them'}`}>
                  <div className="message-text">{m.text}</div>
                  <div className="message-time">{new Date(m.time).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>

            <div className="message-input">
              <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={`Message ${selectedUser.name}...`} />
              <button onClick={() => {
                const text = newMessage.trim()
                if (!text || !currentUserEmail || !selectedUser) return

                const clientId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
                const payload = { from: currentUserEmail, to: selectedUser.email, text, clientId }
                const optimisticMessage = { from: currentUserEmail, to: selectedUser.email, text, time: new Date().toISOString(), clientId }

                appendMessageIfNew(optimisticMessage)
                setNewMessage('')

                fetch('http://localhost:4000/messages', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                }).then(async (res) => {
                  const saved = await res.json()
                  if (!res.ok) throw new Error(saved.error || 'Failed to send')
                  setNewMessage('')
                  appendMessageIfNew(saved)
                }).catch((err) => {
                  console.error('send message error', err)
                })
              }}>Send</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard