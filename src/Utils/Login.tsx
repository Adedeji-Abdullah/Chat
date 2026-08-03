
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, emailValue: string) => {
      e.preventDefault()
      try {
        const response = await fetch(`http://localhost:3005/Info/${encodeURIComponent(emailValue)}`)
        const result = await response.json()
        console.log(result)
        console.log(response)

        if (response.ok) {
          localStorage.setItem('token', 'logged-in')
          navigate('/')
          return
        }

        console.log('Login failed:', result)
      } catch (error) {
        console.log(error + ' Error getting the data')
      }
    }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue chatting with your saved friends.</p>

        <form className="auth-form" onSubmit={(e) => handleSubmit(e, email)}>
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

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Create account</Link>
        </p>
      </div>
    </section>
  )
}

export default Login