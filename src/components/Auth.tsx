/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { Mail, ArrowRight, Info, Compass, ShieldCheck, KeyRound } from 'lucide-react'

interface AuthProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const Auth: React.FC<AuthProps> = ({ showToast }) => {
  const [activeMode, setActiveMode] = useState<'magic-link' | 'pin'>('magic-link')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setMessage(null)

    if (!isSupabaseConfigured || !supabase) {
      setTimeout(() => {
        const msg = 'Supabase belum dikonfigurasi. Kunci API tidak ditemukan.'
        setMessage({ type: 'error', text: msg })
        showToast(msg, 'error')
        setLoading(false)
      }, 800)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (error) throw error

      const msg = 'Magic link telah dikirim ke email Anda! Periksa kotak masuk.'
      setMessage({ type: 'success', text: msg })
      showToast(msg, 'success')
    } catch (err: any) {
      console.error(err)
      const msg = err.message || 'Terjadi kesalahan saat mengirim tautan login.'
      setMessage({ type: 'error', text: msg })
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !pin) return

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      const msg = 'PIN harus berupa 6 digit angka.'
      setMessage({ type: 'error', text: msg })
      showToast(msg, 'error')
      return
    }

    setLoading(true)
    setMessage(null)

    if (!isSupabaseConfigured || !supabase) {
      const msg = 'Supabase belum dikonfigurasi. Kunci API tidak ditemukan.'
      setMessage({ type: 'error', text: msg })
      showToast(msg, 'error')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pin, // Menggunakan PIN sebagai password Supabase
      })

      if (error) throw error

      const msg = 'Login berhasil! Selamat datang kembali.'
      setMessage({ type: 'success', text: msg })
      showToast(msg, 'success')
    } catch (err: any) {
      console.error(err)
      let errorText = err.message || 'Terjadi kesalahan saat masuk dengan PIN.'
      if (err.message === 'Invalid login credentials') {
        errorText = 'Email atau PIN salah. Pastikan Anda sudah membuat PIN di Pengaturan setelah masuk pertama kali via Magic Link.'
      }
      setMessage({
        type: 'error',
        text: errorText
      })
      showToast(errorText, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl transition-colors duration-300">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-1/2 h-1/2 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

        <div className="p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/15 mx-auto mb-4">
              <Compass className="w-6 h-6 text-slate-950" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
              Rakaat Worship Tracker
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Jurnal pelacak ibadah privat untuk membangun konsistensi sholat Anda secara digital dan aman.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveMode('magic-link')
                setMessage(null)
              }}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'magic-link'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/15'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Magic Link</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('pin')
                setMessage(null)
              }}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'pin'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/15'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Masuk via PIN</span>
            </button>
          </div>

          {/* Info Banner when Supabase is missing */}
          {!isSupabaseConfigured && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex gap-3">
              <Info className="w-4 h-4 shrink-0 text-amber-400" />
              <div>
                <span className="font-semibold block mb-0.5">Setup Supabase Diperlukan</span>
                Silakan isi berkas <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">.env</code> Anda di lokal dengan kunci API Supabase untuk mengaktifkan database dan otentikasi.
              </div>
            </div>
          )}

          {/* Messages */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-xs border ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Render Active Form */}
          {activeMode === 'magic-link' ? (
            <form onSubmit={handleMagicLinkLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    id="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white placeholder-slate-600 text-sm outline-none transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Kirim Magic Link Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-500 text-center leading-relaxed mt-4">
                Pilih tab <strong>Magic Link</strong> jika Anda baru pertama kali mendaftar. Setelah berhasil masuk, Anda dapat mengatur PIN keamanan di tab <strong>Pengaturan</strong>.
              </p>
            </form>
          ) : (
            <form onSubmit={handlePinLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    id="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white placeholder-slate-600 text-sm outline-none transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pin" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  PIN Keamanan (6 Digit Angka)
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    id="pin"
                    placeholder="••••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/40 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white placeholder-slate-600 text-sm tracking-widest outline-none transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
              >
                {loading ? (
                  <span className="w-5 h-5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Masuk dengan PIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-500 text-center leading-relaxed mt-4">
                Lupa PIN Anda? Anda dapat masuk kembali kapan saja menggunakan tab <strong>Magic Link</strong> untuk menyetel ulang PIN di dalam aplikasi.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
