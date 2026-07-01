import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import Login from './components/Login.jsx'
import AppShell from './components/AppShell.jsx'
import MonthView from './components/MonthView.jsx'
import OwedToMe from './components/OwedToMe.jsx'
import Accounts from './components/Accounts.jsx'
import SavingsPots from './components/SavingsPots.jsx'
import Settings from './components/Settings.jsx'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <div className="spinner" />
  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<MonthView />} />
        <Route path="/owed" element={<OwedToMe />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/savings" element={<SavingsPots />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
