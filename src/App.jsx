import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Stats from './components/Stats'
import Clients from './components/Clients'
import Services from './components/Services'
import Projects from './components/Projects'
import FAQ from './components/FAQ'
import Blog from './components/Blog'
import Footer from './components/Footer'
import SignIn from './components/SignIn'
import RoleSelect from './components/RoleSelect'
import ProtectedRoute from './components/ProtectedRoute'
import ClientDashboard from './components/ClientDashboard'
import DeveloperDashboard from './components/DeveloperDashboard'
import AIAgent from './components/AIAgent'

function LandingPage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <Clients />
      <Services />
      <Projects />
      <FAQ />
      <Blog />
      <Footer />
    </>
  )
}

function App() {
  return (
    <div className="app">
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignIn />} />

        {/* Role Selection — shown after first login, before dashboard */}
        <Route path="/select-role" element={<RoleSelect />} />

        {/* Role-based protected dashboards */}
        <Route path="/dashboard/client" element={
          <ProtectedRoute role="client">
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/developer" element={
          <ProtectedRoute role="developer">
            <DeveloperDashboard />
          </ProtectedRoute>
        } />

        {/* Legacy /dashboard redirect — ProtectedRoute will pick the right one */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Navigate to="/select-role" replace />
          </ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AIAgent />
    </div>
  )
}

export default App
