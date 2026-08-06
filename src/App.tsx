import './App.css'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './Utils/Dashboard'
import PrivateRoute from './Utils/PrivateRoute'
import Login from './Utils/Login'
import Register from './Utils/Register'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<PrivateRoute />} >
      <Route path="/" element={<Dashboard />} />
      </Route>
    </Routes>
  )
}

export default App
