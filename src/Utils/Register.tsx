import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {useState} from 'react'
// import { link } from 'fs'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [move, setMove] = useState(false)

  const collection = {name, email, password}
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    try {
        const data = await fetch("https://chat-1-n1mo.onrender.com/register", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(collection)
        })
        const result = await data.json()
        console.log(result)
        setMove(true)
        if(data.ok) {
            navigate('/login')
        }
    } catch (error) {
        console.log("Couldn't redirect")
    }
  }


  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="auth-subtitle">Register now and start chatting with your connected friends.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="name">Name</label>
            <input type="text" id="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button className="auth-button" type="submit">Register</button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
      {move ? <Link to="/login" /> : null}
    </section>
  )
}

export default Register