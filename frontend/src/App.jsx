import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import useAuthStore from './store/authStore'
import AppRoutes from './routes/AppRoutes'
import { ToastContainer } from './components/ui/Toast'
import CivicWatermarkBackground from './components/ui/CivicWatermarkBackground'
import './styles/global.css'

export default function App() {
  const { checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <BrowserRouter>
      <CivicWatermarkBackground />
      <AppRoutes />
      <ToastContainer />
    </BrowserRouter>
  )
}
