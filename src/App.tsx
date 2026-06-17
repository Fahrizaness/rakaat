/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { prayerService } from './services/prayerService'
import type { PrayerLog } from './services/prayerService'
import { supabase, isSupabaseConfigured } from './lib/supabaseClient'
import { Compass, X } from 'lucide-react'

function App() {
  const [user, setUser] = useState<any>(null)
  const [logs, setLogs] = useState<PrayerLog[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPopup, setShowInstallPopup] = useState<boolean>(false)
  const [isIOS] = useState<boolean>(() => {
    const userAgent = window.navigator.userAgent.toLowerCase()
    return /iphone|ipad|ipod/.test(userAgent)
  })

  interface ToastItem {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }

  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  useEffect(() => {
    // Check if running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true

    // Check if dismissed in localStorage
    const dismissedTime = localStorage.getItem('rakaat_install_prompt_dismissed')
    const now = Date.now()
    const isDismissed = dismissedTime && (now - parseInt(dismissedTime, 10)) < 7 * 24 * 60 * 60 * 1000 // 7 days

    if (!isStandalone && !isDismissed) {
      const timer = setTimeout(() => {
        setShowInstallPopup(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
      const dismissedTime = localStorage.getItem('rakaat_install_prompt_dismissed')
      const now = Date.now()
      const isDismissed = dismissedTime && (now - parseInt(dismissedTime, 10)) < 7 * 24 * 60 * 60 * 1000

      if (!isStandalone && !isDismissed) {
        setShowInstallPopup(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User choice: ${outcome}`)
    setDeferredPrompt(null)
    setShowInstallPopup(false)
  }

  const handleDismissInstall = () => {
    localStorage.setItem('rakaat_install_prompt_dismissed', Date.now().toString())
    setShowInstallPopup(false)
  }
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('rakaat_theme_mode')
    return (saved === 'light' || saved === 'dark' || saved === 'system') ? saved : 'system'
  })

  useEffect(() => {
    const root = window.document.documentElement
    
    const applyTheme = () => {
      if (themeMode === 'dark') {
        root.classList.add('dark')
      } else if (themeMode === 'light') {
        root.classList.remove('dark')
      } else {
        // System preference
        const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (systemIsDark) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }
    }

    applyTheme()
    localStorage.setItem('rakaat_theme_mode', themeMode)

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => applyTheme()
      mediaQuery.addEventListener('change', listener)
      return () => mediaQuery.removeEventListener('change', listener)
    }
  }, [themeMode])

  const handleChangeThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode)
  }


  useEffect(() => {
    let active = true
    let subscription: any = null

    const initializeAuth = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (active) {
            if (session) {
              setUser(session.user)
              const data = await prayerService.getLogs(session.user.id)
              if (active) setLogs(data)
            }
          }
        } catch (error) {
          console.error('Error getting Supabase session:', error)
        } finally {
          if (active) setLoading(false)
        }
      } else {
        // Not configured
        if (active) setLoading(false)
      }
    }

    initializeAuth()

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session) {
          if (active) {
            setUser(session.user)
            setLoading(true)
            const data = await prayerService.getLogs(session.user.id)
            if (active) {
              setLogs(data)
              setLoading(false)
            }
          }
        } else {
          if (active) {
            setUser(null)
            setLogs([])
          }
        }
      })
      subscription = sub
    }

    return () => {
      active = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const handleTogglePrayer = async (date: string, prayer: 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya') => {
    if (!user) return
    const isCurrentlyChecked = logs.some(l => l.date === date && l[prayer])
    const updatedLogs = await prayerService.togglePrayer(user.id, date, prayer)
    setLogs(updatedLogs)

    const label = prayer.charAt(0).toUpperCase() + prayer.slice(1)
    if (isCurrentlyChecked) {
      showToast(`Catatan sholat ${label} dibatalkan.`, 'info')
    } else {
      showToast(`Sholat ${label} berhasil dicatat!`, 'success')
    }
  }

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setLogs([])
    showToast('Anda telah keluar dari akun.', 'info')
  }

  const handleUpdatePin = async (pin: string) => {
    if (!supabase || !user) {
      showToast('Sesi tidak aktif atau Supabase belum terhubung.', 'error')
      return { success: false, message: 'Supabase belum terhubung atau sesi tidak aktif.' }
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: pin,
        data: { has_pin: true }
      })
      if (error) throw error
      showToast('PIN Keamanan berhasil disimpan!', 'success')
      return { success: true, message: 'PIN Keamanan berhasil disimpan! Anda sekarang bisa masuk menggunakan PIN ini.' }
    } catch (e: any) {
      console.error('Error setting PIN:', e)
      showToast(e.message || 'Gagal menyimpan PIN Keamanan.', 'error')
      return { success: false, message: e.message || 'Gagal menyimpan PIN Keamanan.' }
    }
  }

  const handleUpdateProfileName = async (name: string) => {
    if (!supabase || !user) {
      showToast('Sesi tidak aktif atau Supabase belum terhubung.', 'error')
      return { success: false, message: 'Supabase belum terhubung atau sesi tidak aktif.' }
    }
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: name }
      })
      if (error) throw error

      const { data: { user: updatedUser }, error: getError } = await supabase.auth.getUser()
      if (getError) throw getError
      if (updatedUser) {
        setUser(updatedUser)
      }
      showToast('Nama profil berhasil diperbarui!', 'success')
      return { success: true, message: 'Nama profil berhasil diperbarui!' }
    } catch (e: any) {
      console.error('Error updating profile name:', e)
      showToast(e.message || 'Gagal memperbarui nama profil.', 'error')
      return { success: false, message: e.message || 'Gagal memperbarui nama profil.' }
    }
  }

  // Calculate statistics
  const stats = prayerService.calculateStats(logs)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/15 animate-pulse-subtle">
          <Compass className="w-6 h-6 text-slate-950" />
        </div>
        <p className="text-slate-400 text-xs tracking-wider uppercase font-semibold animate-pulse">
          Menyiapkan Jurnal Ibadah...
        </p>
      </div>
    )
  }

  const showOnboarding = !user

  return (
    <div className="min-h-screen flex flex-col text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Header Navigasi */}
      <Header 
        user={user}
        onLogout={handleLogout}
      />

      {/* Konten Utama */}
      {showOnboarding ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <Auth showToast={showToast} />
        </div>
      ) : (
        <Dashboard 
          logs={logs}
          onTogglePrayer={handleTogglePrayer}
          stats={stats}
          user={user}
          themeMode={themeMode}
          onChangeThemeMode={handleChangeThemeMode}
          onUpdatePin={handleUpdatePin}
          onUpdateProfileName={handleUpdateProfileName}
          showInstallPopup={showInstallPopup}
          isIOS={isIOS}
          deferredPrompt={deferredPrompt}
          onInstallPWA={handleInstallPWA}
          onDismissInstall={handleDismissInstall}
        />
      )}

      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3 pointer-events-none max-w-sm w-full px-4 sm:bottom-auto sm:top-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto w-full bg-slate-900/95 dark:bg-slate-900 border border-slate-200/20 dark:border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3 animate-scale-in"
          >
            <div className="flex items-center gap-3">
              {/* Rakaat Icon */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-emerald-400 dark:from-brand-600 dark:to-brand-400 flex items-center justify-center shadow-md shadow-emerald-500/10 shrink-0">
                <Compass className="w-4.5 h-4.5 text-slate-950 font-bold" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">
                  Rakaat
                </p>
                <p className="text-[11px] text-slate-300 font-medium mt-0.5 leading-normal">
                  {toast.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer active:scale-95 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
