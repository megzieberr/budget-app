import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

const NAV = [
  { to: '/', label: 'Month', icon: '📅', end: true },
  { to: '/owed', label: 'Owed', icon: '🤝' },
  { to: '/accounts', label: 'Accounts', icon: '🏦' },
  { to: '/savings', label: 'Savings', icon: '🎯' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function AppShell() {
  const { logout } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <strong>My Budget</strong>
          <div className="btn-row">
            <button className="icon-btn" onClick={toggle} title="Toggle dark mode">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="btn btn-sm" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <nav className="bottomnav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="nav-ico">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
