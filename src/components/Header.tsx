/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react'
import { LogOut, Cloud, User, Compass } from 'lucide-react'

interface HeaderProps {
  user: any;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  user, 
  onLogout
}) => {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 dark:from-brand-600 dark:to-brand-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 dark:shadow-brand-500/10">
            <Compass className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white m-0 leading-none">
              Rakaat
            </h1>
            <span className="text-[10px] text-emerald-600 dark:text-brand-400 font-medium tracking-widest uppercase">
              Worship Tracker
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Authentication & Sync status */}
          {user && (
            <div className="flex items-center gap-2 relative">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-xs text-emerald-600 dark:text-emerald-400">
                <Cloud className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                <span>Tersinkronisasi</span>
              </div>

              {/* User profile icon clickable for dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-650 dark:text-slate-300 transition-colors cursor-pointer active:scale-95"
                  title="Menu Profil"
                >
                  <User className="w-4 h-4" />
                </button>

                {showDropdown && (
                  <>
                    {/* Backdrop to close dropdown on click outside */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                    <div className="absolute right-0 top-full mt-2.5 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl z-50 animate-scale-in">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Masuk Sebagai</span>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 truncate" title={user?.user_metadata?.display_name || 'Pengguna Rakaat'}>
                        {user?.user_metadata?.display_name || 'Pengguna Rakaat'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-450 truncate" title={user?.email}>
                        {user?.email}
                      </p>
                      
                      <div className="h-px bg-slate-200 dark:bg-slate-800/80 my-3" />
                      
                      <button
                        onClick={() => {
                          setShowDropdown(false)
                          onLogout()
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
