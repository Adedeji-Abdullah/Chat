
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      setErrorMessage('')
      try {
        const response = await fetch('http://localhost:4000/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        })

        const result = await response.json()
        console.log(result)

        if (response.ok) {
          localStorage.setItem('token', 'logged-in')
          localStorage.setItem('email', email.trim().toLowerCase())
          navigate('/')
          return
        }

        setErrorMessage(result.error || 'Login failed')
      } catch (error) {
        console.log(error + ' Error logging in')
        setErrorMessage('Network error, please try again')
      }
    }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue chatting with your saved friends.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button className="auth-button" type="submit">Login</button>
        </form>

        {errorMessage && <p className="auth-error">{errorMessage}</p>}

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Create account</Link>
        </p>
      </div>
    </section>
  )
}

export default Login