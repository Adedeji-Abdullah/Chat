import React, { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

const PrivateRoute = () => {
//    const [isAuthenticated, setIsAuthenticated] = useState("")

  const isAuthenticated = !!localStorage.getItem('token')

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return <Outlet />
}


export default PrivateRoute