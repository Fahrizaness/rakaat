/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react'
import type { PrayerLog } from '../services/prayerService'
import { getJakartaDateString } from '../services/prayerService'
import { fetchPrayerTimings, getNextPrayer, formatRemainingTime } from '../services/prayerTimeService'
import { 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Calendar,
  Trophy,
  Info,
  CheckSquare,
  BarChart3,
  Settings,
  User,
  Cloud,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Search,
  Sun,
  Moon,
  Monitor,
  ShieldCheck,
  Download,
  X,
  RotateCw
} from 'lucide-react'

interface DashboardProps {
  logs: PrayerLog[];
  onTogglePrayer: (date: string, prayer: 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya') => void;
  stats: {
    currentStreak: number;
    longestStreak: number;
    monthlyCompletionRate: number;
    totalChecked: number;
    totalEligible: number;
    comparisonGrowth: number;
    prayerConsistency: {
      subuh: number;
      dzuhur: number;
      ashar: number;
      maghrib: number;
      isya: number;
    };
  };
  user: any;
  themeMode: 'light' | 'dark' | 'system';
  onChangeThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  onUpdatePin: (pin: string) => Promise<{ success: boolean; message: string }>;
  onUpdateProfileName: (name: string) => Promise<{ success: boolean; message: string }>;
  showInstallPopup: boolean;
  isIOS: boolean;
  deferredPrompt: any;
  onInstallPWA: () => Promise<void>;
  onDismissInstall: () => void;
}

interface PrayerDoa {
  id: string;
  title: string;
  arabic: string;
  latin: string;
  translation: string;
  category: string;
}

const DAILY_DOAS: PrayerDoa[] = [
  {
    id: 'bangun-tidur',
    category: 'Tidur & Bangun',
    title: 'Doa Bangun Tidur',
    arabic: 'اَلْحَمْدُ لِلَّهِ الَّذِيْ أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُوْرُ',
    latin: 'Alhamdulillahil ladzi ahyana ba\'da ma amatana wa ilaihin nusyur.',
    translation: 'Segala puji bagi Allah yang telah menghidupkan kami kembali setelah mematikan kami (tidur) dan hanya kepada-Nya kami kembali.'
  },
  {
    id: 'sebelum-tidur',
    category: 'Tidur & Bangun',
    title: 'Doa Sebelum Tidur',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَحْيَا وَأَمُوتُ',
    latin: 'Bismika Allahumma ahya wa amut.',
    translation: 'Dengan nama-Mu ya Allah aku hidup dan aku mati.'
  },
  {
    id: 'orang-tua',
    category: 'Keluarga',
    title: 'Doa untuk Kedua Orang Tua',
    arabic: 'رَبِّ اغْفِرْ لِيْ وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِيْ صَغِيْرًا',
    latin: 'Rabbighfir li waliwalidayya warhamhuma kama rabbayani shaghira.',
    translation: 'Ya Tuhanku, ampunilah aku dan kedua orang tuaku, dan kasihilah mereka keduanya sebagaimana mereka dipelihara mendidik aku di waktu kecil.'
  },
  {
    id: 'sapu-jagad',
    category: 'Kebaikan Umum',
    title: 'Doa Sapu Jagad (Kebaikan Dunia Akhirat)',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    latin: 'Rabbana atina fid-dunya hasanatah, wa fil-akhirati hasanatah, wa qina \'adzaban-nar.',
    translation: 'Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari azab neraka.'
  },
  {
    id: 'setelah-adzan',
    category: 'Sholat & Ibadah',
    title: 'Doa Setelah Adzan',
    arabic: 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ',
    latin: 'Allahumma rabba hadzihid da\'watit tammah, wash-shalatil qa\'imah, ati Muhammadanil wasilata wal fadhilah, wab\'atshu maqamam mahmudanil ladzi wa\'adtah.',
    translation: 'Ya Allah, Tuhan pemilik seruan yang sempurna ini dan sholat yang tegak berdiri, berilah Nabi Muhammad wasilah (wasilah/tempat tinggi) dan keutamaan, dan bangkitkanlah beliau di tempat yang terpuji yang telah Engkau janjikan.'
  },
  {
    id: 'pembuka-rezeki',
    category: 'Rezeki & Keberkahan',
    title: 'Doa Pembuka Pintu Rezeki (Doa Nabi Musa)',
    arabic: 'رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ',
    latin: 'Rabbi inni lima anzalta ilayya min khairin faqir.',
    translation: 'Ya Tuhanku, sesungguhnya aku sangat memerlukan sesuatu kebaikan (rezeki) yang Engkau turunkan kepadaku.'
  }
]

const SHOLAT_QUOTES = [
  "Sholat adalah tiang agama, barangsiapa mendirikannya maka ia mendirikan agama.",
  "Amalan yang pertama kali dihisab pada hari kiamat adalah sholat wajib.",
  "Jadikanlah sabar dan sholat sebagai penolongmu. Sesungguhnya Allah bersama orang yang sabar.",
  "Sholat tepat waktu adalah amalan yang paling dicintai oleh Allah SWT.",
  "Batas antara seorang muslim dengan kesyirikan dan kekafiran adalah meninggalkan sholat.",
  "Sesungguhnya sholat itu mencegah dari perbuatan keji dan kemungkaran.",
  "Sholatlah selagi kau bisa sholat, sebelum kau disholatkan.",
  "Dua rakaat sholat Subuh lebih baik daripada dunia dan segala isinya.",
  "Jagalah sholatmu, karena ketika kamu kehilangannya, kamu kehilangan segalanya.",
  "Sholat lima waktu laksana sungai mengalir di depan pintu rumah yang membersihkan kotoran setiap hari."
]

interface DailyDoa {
  arabic: string;
  latin: string;
  translation: string;
  source?: string;
}

const SHORT_DOAS: DailyDoa[] = [
  {
    arabic: "رَبِّ زِدْنِي عِلْمًا",
    latin: "Rabbi zidni 'ilma",
    translation: "Ya Tuhanku, tambahkanlah ilmu kepadaku.",
    source: "QS. Taha: 114"
  },
  {
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلًا مُتَقَبَّلًا",
    latin: "Allahumma inni as'aluka 'ilman nafi'an, wa rizqan tayyiban, wa 'amalan mutaqabbalan",
    translation: "Ya Allah, aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang baik, dan amal yang diterima.",
    source: "HR. Ibnu Majah"
  },
  {
    arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ",
    latin: "Rabbighfir li waliwalidayya",
    translation: "Ya Tuhanku, ampunilah aku dan kedua orang tuaku.",
    source: "QS. Nuh: 28"
  },
  {
    arabic: "يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ",
    latin: "Ya Muqallibal quluub, tsabbit qalbi 'ala diinik",
    translation: "Wahai Dzat yang membolak-balikkan hati, teguhkanlah hatiku di atas agama-Mu.",
    source: "HR. Tirmidzi"
  },
  {
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    latin: "Rabbana atina fid-dunya hasanah, wa fil-akhirati hasanah, wa qina 'adzaban-nar",
    translation: "Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari azab neraka.",
    source: "QS. Al-Baqarah: 201"
  },
  {
    arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
    latin: "Allahumma a'inni 'ala dzikrika wa syukrika wa husni 'ibadatik",
    translation: "Ya Allah, tolonglah aku untuk selalu mengingat-Mu, bersyukur kepada-Mu, dan beribadah dengan baik kepada-Mu.",
    source: "HR. Abu Dawud"
  },
  {
    arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
    latin: "Rabbi-syrahli sadri, wa yassirli amri",
    translation: "Ya Tuhanku, lapangkanlah dadaku, dan mudahkanlah urusanku.",
    source: "QS. Taha: 25-26"
  },
  {
    arabic: "اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
    latin: "Allahumma innaka 'afuwwun tuhibbul 'afwa fa'fu 'anni",
    translation: "Ya Allah, sesungguhnya Engkau Maha Pemaaf dan menyukai kemaafan, maka maafkanlah aku.",
    source: "HR. Tirmidzi"
  },
  {
    arabic: "رَبِّ هَبْ لِي مِنَ الصَّالِحِينَ",
    latin: "Rabbi hab li minas-shalihin",
    translation: "Ya Tuhanku, anugerahkanlah kepadaku (seorang anak) yang termasuk orang-orang yang saleh.",
    source: "QS. As-Saffat: 100"
  },
  {
    arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    latin: "Hasbunallahu wa ni'mal wakil",
    translation: "Cukuplah Allah bagi kami dan Dia adalah sebaik-baik pelindung.",
    source: "QS. Ali 'Imran: 173"
  },
  {
    arabic: "رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ",
    latin: "Rabbi awzi'ni an asykura ni'matak",
    translation: "Ya Tuhanku, berilah aku ilham untuk tetap mensyukuri nikmat-Mu.",
    source: "QS. An-Naml: 19"
  },
  {
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى",
    latin: "Allahumma inni as'alukal-huda wat-tuqa wal-'afafa wal-ghina",
    translation: "Ya Allah, aku memohon kepada-Mu petunjuk, ketakwaan, kesucian diri, dan kecukupan.",
    source: "HR. Muslim"
  },
  {
    arabic: "رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنْتَ السَّمِيعُ الْعَلِيمُ",
    latin: "Rabbana taqabbal minna innaka Antas-Sami'ul-'Alim",
    translation: "Ya Tuhan kami, terimalah dari kami (amalan kami), sesungguhnya Engkaulah Yang Maha Mendengar lagi Maha Mengetahui.",
    source: "QS. Al-Baqarah: 127"
  },
  {
    arabic: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا",
    latin: "Rabbana la tuzigh quluubana ba'da idz hadaitana",
    translation: "Ya Tuhan kami, janganlah Engkau jadikan hati kami condong kepada kesesatan sesudah Engkau beri petunjuk kepada kami.",
    source: "QS. Ali 'Imran: 8"
  },
  {
    arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَاَنَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    latin: "La ilaha illa Anta subhanaka inni kuntu minaz-zhalimin",
    translation: "Tidak ada Tuhan selain Engkau. Maha Suci Engkau, sesungguhnya aku adalah termasuk orang-orang yang zalim.",
    source: "QS. Al-Anbiya: 87"
  }
]


export const Dashboard: React.FC<DashboardProps> = ({ 
  logs, 
  onTogglePrayer, 
  stats,
  user,
  themeMode,
  onChangeThemeMode,
  onUpdatePin,
  onUpdateProfileName,
  showInstallPopup,
  isIOS,
  deferredPrompt,
  onInstallPWA,
  onDismissInstall
}) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return getJakartaDateString()
  })
  
  const [activeTab, setActiveTab] = useState<'tracker' | 'stats' | 'doa' | 'settings'>('tracker')
  
  // Prayer Times states
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = localStorage.getItem('rakaat_user_location')
    return saved ? JSON.parse(saved) : null
  })
  const [prayerData, setPrayerData] = useState<any>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [nextPrayer, setNextPrayer] = useState<any>(null)
  const [countdownStr, setCountdownStr] = useState<string>('')
  const [showAllTimings, setShowAllTimings] = useState(false)

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung.')
      setLocation({ lat: -6.2088, lng: 106.8456 }) // fallback JKT
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        localStorage.setItem('rakaat_user_location', JSON.stringify(newLoc))
        setLocation(newLoc)
        setLocationError(null)
      },
      (error) => {
        console.warn('Geolocation error:', error)
        setLocationError('Akses lokasi ditolak.')
        const fallbackLoc = { lat: -6.2088, lng: 106.8456 }
        localStorage.setItem('rakaat_user_location', JSON.stringify(fallbackLoc))
        setLocation(fallbackLoc)
      }
    )
  }

  // Load timings on location change
  useEffect(() => {
    const loadTimings = async (lat: number, lng: number) => {
      setLocationLoading(true)
      try {
        const data = await fetchPrayerTimings(lat, lng)
        setPrayerData(data)
      } catch (err: any) {
        console.error('Error fetching prayer timings:', err)
        setLocationError('Gagal memuat jadwal sholat.')
        // Fallback to Jakarta
        try {
          const fallbackData = await fetchPrayerTimings(-6.2088, 106.8456)
          setPrayerData(fallbackData)
        } catch (e) {
          console.error('Fallback failed too:', e)
        }
      } finally {
        setLocationLoading(false)
      }
    }

    if (location) {
      loadTimings(location.lat, location.lng)
    } else {
      const timer = setTimeout(() => {
        detectLocation()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [location])

  // Countdown timer interval
  useEffect(() => {
    if (!prayerData) return

    const updateTimer = () => {
      try {
        const next = getNextPrayer(prayerData.timings, prayerData.timezone)
        setNextPrayer(next)
        setCountdownStr(formatRemainingTime(next.remainingSeconds))
      } catch (err) {
        console.error('Error calculating countdown:', err)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [prayerData])
  const [doaSearch, setDoaSearch] = useState<string>('')
  const [expandedDoaId, setExpandedDoaId] = useState<string | null>(null)

  // PIN security states
  const [pin, setPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile editing states
  const [profileName, setProfileName] = useState(() => user?.user_metadata?.display_name || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSaveProfileName = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMessage(null)

    if (!profileName.trim()) {
      setProfileMessage({ type: 'error', text: 'Nama profil tidak boleh kosong.' })
      return
    }

    setProfileLoading(true)
    const res = await onUpdateProfileName(profileName.trim())
    setProfileLoading(false)
    
    if (res.success) {
      setProfileMessage({ type: 'success', text: res.message })
    } else {
      setProfileMessage({ type: 'error', text: res.message })
    }
  }

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinMessage(null)

    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setPinMessage({ type: 'error', text: 'PIN harus berupa 6 digit angka.' })
      return
    }

    setPinLoading(true)
    const res = await onUpdatePin(pin)
    setPinLoading(false)
    
    if (res.success) {
      setPinMessage({ type: 'success', text: res.message })
      setPin('')
    } else {
      setPinMessage({ type: 'error', text: res.message })
    }
  }

  const getGreetingTime = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 11) return 'Selamat Pagi,'
    if (hour >= 11 && hour < 15) return 'Selamat Siang,'
    if (hour >= 15 && hour < 18) return 'Selamat Sore,'
    return 'Selamat Malam,'
  }

  const getDailyQuote = () => {
    const day = new Date().getDate()
    const index = day % SHOLAT_QUOTES.length
    return SHOLAT_QUOTES[index]
  }

  // Format today's date in Indonesian
  const getIndonesianDateString = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    return dateObj.toLocaleDateString('id-ID', options)
  }

  // Get current log for selected date
  const currentLog = logs.find(l => l.date === selectedDate) || {
    date: selectedDate,
    subuh: false,
    dzuhur: false,
    ashar: false,
    maghrib: false,
    isya: false
  }

  const prayersList: { key: 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya'; label: string; time: string }[] = [
    { key: 'subuh', label: 'Subuh', time: '04:45' },
    { key: 'dzuhur', label: 'Dzuhur', time: '12:05' },
    { key: 'ashar', label: 'Ashar', time: '15:25' },
    { key: 'maghrib', label: 'Maghrib', time: '18:15' },
    { key: 'isya', label: 'Isya', time: '19:30' }
  ]

  const totalPrayedToday = [
    currentLog.subuh, 
    currentLog.dzuhur, 
    currentLog.ashar, 
    currentLog.maghrib, 
    currentLog.isya
  ].filter(Boolean).length

  const isToday = selectedDate === getJakartaDateString()

  // Generate 20 weeks of heatmap cells
  const generateHeatmapData = () => {
    const numWeeks = 20
    const totalDays = numWeeks * 7
    const result = []
    
    const jakartaTodayStr = getJakartaDateString()
    const [y, m, d] = jakartaTodayStr.split('-').map(Number)
    const today = new Date(y, m - 1, d)
    const currentDay = today.getDay()
    
    const start = new Date(today)
    start.setDate(today.getDate() - totalDays + currentDay + 1)

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(start)
      currentDate.setDate(start.getDate() + i)
      const dateStr = getJakartaDateString(currentDate)
      
      const log = logs.find(l => l.date === dateStr)
      let count = 0
      if (log) {
        if (log.subuh) count++
        if (log.dzuhur) count++
        if (log.ashar) count++
        if (log.maghrib) count++
        if (log.isya) count++
      }
      
      result.push({
        date: dateStr,
        count,
        dayOfWeek: currentDate.getDay(),
        formattedDate: currentDate.toLocaleDateString('id-ID', { month: 'short', day: 'numeric', weekday: 'short' })
      })
    }
    return result
  }

  const heatmapCells = generateHeatmapData()

  // Group cells by week
  const heatmapWeeks: typeof heatmapCells[] = []
  for (let i = 0; i < heatmapCells.length; i += 7) {
    heatmapWeeks.push(heatmapCells.slice(i, i + 7))
  }

  // Get color scale class based on prayer count
  const getHeatmapColorClass = (count: number) => {
    switch (count) {
      case 0: return 'bg-slate-200 dark:bg-slate-800 border-slate-300/60 dark:border-slate-900/40 hover:bg-slate-300 dark:hover:bg-slate-700'
      case 1:
      case 2: return 'bg-amber-500/20 dark:bg-amber-500/30 border-amber-500/10 dark:border-amber-500/20 text-amber-600 dark:text-amber-200 hover:bg-amber-500/30 dark:hover:bg-amber-500/40'
      case 3:
      case 4: return 'bg-emerald-500/20 dark:bg-emerald-600/50 border-emerald-550/10 dark:border-emerald-600/30 text-emerald-700 dark:text-emerald-100 hover:bg-emerald-500/30 dark:hover:bg-emerald-600/70'
      case 5: return 'bg-emerald-500 border-emerald-400/25 dark:border-emerald-400/30 text-white hover:bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.2)]'
      default: return 'bg-slate-200 dark:bg-slate-800'
    }
  }

  // Month labels helper
  const getMonthLabels = () => {
    const labels: { text: string; colSpan: number }[] = []
    let currentMonth = ''
    let count = 0

    heatmapWeeks.forEach((week, index) => {
      const midDay = new Date(week[3].date)
      const monthName = midDay.toLocaleDateString('id-ID', { month: 'short' })
      
      if (monthName !== currentMonth) {
        if (count > 0) {
          labels.push({ text: currentMonth, colSpan: count })
        }
        currentMonth = monthName
        count = 1
      } else {
        count++
      }

      if (index === heatmapWeeks.length - 1) {
        labels.push({ text: currentMonth, colSpan: count })
      }
    })

    return labels
  }

  const monthLabels = getMonthLabels()

  // Filtered daily prayers list
  const filteredDoas = DAILY_DOAS.filter(doa => {
    const query = doaSearch.toLowerCase()
    return (
      doa.title.toLowerCase().includes(query) ||
      doa.translation.toLowerCase().includes(query) ||
      doa.latin.toLowerCase().includes(query) ||
      doa.category.toLowerCase().includes(query)
    )
  })

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6 flex-1 w-full pb-32 transition-colors duration-300">
      
      {/* Floating Bottom Navigation Bar (iOS / Mobile Tab Bar style - Sits directly at the bottom edge) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800/80 shadow-[0_-4px_25px_rgba(15,23,42,0.03)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.2)] py-2.5 flex items-center justify-between px-6 pb-6 sm:pb-3.5 transition-all duration-300 after:absolute after:top-full after:left-0 after:right-0 after:h-12 after:bg-white dark:after:bg-[#0f172a]">
        <button
          onClick={() => {
            setActiveTab('tracker')
          }}
          className={`flex flex-col items-center gap-1.5 py-1 rounded-xl transition-all duration-200 flex-1 cursor-pointer ${
            activeTab === 'tracker'
              ? 'text-emerald-600 dark:text-brand-400 font-bold scale-105'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          <CheckSquare className="w-5.5 h-5.5 shrink-0" />
          <span className="text-[10px] tracking-wide font-medium">Pelacak</span>
        </button>
        
        <button
          onClick={() => {
            setActiveTab('stats')
          }}
          className={`flex flex-col items-center gap-1.5 py-1 rounded-xl transition-all duration-200 flex-1 cursor-pointer ${
            activeTab === 'stats'
              ? 'text-emerald-600 dark:text-brand-400 font-bold scale-105'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          <BarChart3 className="w-5.5 h-5.5 shrink-0" />
          <span className="text-[10px] tracking-wide font-medium">Statistik</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('doa')
          }}
          className={`flex flex-col items-center gap-1.5 py-1 rounded-xl transition-all duration-200 flex-1 cursor-pointer ${
            activeTab === 'doa'
              ? 'text-emerald-600 dark:text-brand-400 font-bold scale-105'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-5.5 h-5.5 shrink-0" />
          <span className="text-[10px] tracking-wide font-medium">Doa</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('settings')
          }}
          className={`flex flex-col items-center gap-1.5 py-1 rounded-xl transition-all duration-200 flex-1 cursor-pointer ${
            activeTab === 'settings'
              ? 'text-emerald-600 dark:text-brand-400 font-bold scale-105'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white'
          }`}
        >
          <Settings className="w-5.5 h-5.5 shrink-0" />
          <span className="text-[10px] tracking-wide font-medium">Pengaturan</span>
        </button>
      </div>

      {/* RENDER VIEW BERDASARKAN AKTIF TAB */}

      {/* TAB 1: PELACAK */}
      {activeTab === 'tracker' && (
        <div className="space-y-6 max-w-xl mx-auto animate-fade-in">
          
          {/* PWA Install Banner (styled like user screenshot) */}
          {showInstallPopup && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/30 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-brand-400 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="font-bold text-slate-850 dark:text-white text-xs sm:text-sm leading-tight">
                    Pasang Rakaat di HP Anda!
                  </h4>
                  {isIOS && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                      Ketuk Bagikan &rarr; Tambahkan ke Layar Utama
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {!isIOS && deferredPrompt ? (
                  <button
                    onClick={onInstallPWA}
                    className="bg-emerald-500 hover:bg-emerald-600 dark:bg-brand-500 dark:hover:bg-brand-600 text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
                  >
                    Pasang
                  </button>
                ) : isIOS ? (
                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 font-bold px-2 py-1 rounded-md border border-slate-200/50 dark:border-slate-700">
                    iOS Safari
                  </span>
                ) : (
                  <span className="text-[9px] text-slate-450 dark:text-slate-500 font-medium">
                    Tersedia
                  </span>
                )}
                <button
                  onClick={onDismissInstall}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Top Header Panel (Greeting + Prayer Widget) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mt-2 mb-1 pl-1">
            {/* Welcome Greeting Header */}
            <div className="space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-none block">
                {getGreetingTime()}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Pengguna Rakaat'}
              </h2>
              <p className="text-[11px] sm:text-xs text-emerald-600 dark:text-brand-400 italic font-medium leading-relaxed max-w-md mt-1.5 opacity-90">
                &ldquo;{getDailyQuote()}&rdquo;
              </p>
            </div>

            {/* Prayer Time & Countdown Widget */}
            <div className="glass-panel rounded-3xl p-4 sm:p-5 flex-1 md:max-w-md w-full relative overflow-hidden border border-emerald-100/40 dark:border-amber-500/10 bg-gradient-to-tr from-white to-slate-50/50 dark:from-[#1e293b]/40 dark:to-[#0f172a]/30 shadow-md">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  {/* Hijri Date */}
                  {prayerData && (
                    <span className="text-[9px] font-bold text-slate-500 dark:text-brand-400/80 uppercase tracking-widest block">
                      {prayerData.hijri.day} {prayerData.hijri.monthEn} {prayerData.hijri.year} H
                    </span>
                  )}
                  {nextPrayer ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {nextPrayer.name}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-brand-400">
                        {nextPrayer.timeStr}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">Mendeteksi lokasi...</span>
                  )}
                </div>

                {/* Countdown display */}
                {nextPrayer && (
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-semibold">
                      Sisa Waktu
                    </span>
                    <span className="text-base sm:text-lg font-extrabold tracking-wider font-mono text-slate-900 dark:text-white animate-pulse-subtle">
                      {countdownStr}
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between border-t border-slate-200/50 dark:border-slate-800/60 mt-3 pt-3.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={detectLocation}
                    disabled={locationLoading}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700 text-slate-500 dark:text-slate-300 transition-all cursor-pointer active:scale-90"
                    title="Deteksi ulang lokasi"
                  >
                    <RotateCw className={`w-3 h-3 ${locationLoading ? 'animate-spin' : ''}`} />
                  </button>
                  {locationError ? (
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-500/85 font-semibold">
                      Fallback: JKT
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-450 dark:text-slate-500 font-semibold truncate max-w-[120px]">
                      {prayerData ? `Zone: ${prayerData.timezone.split('/').pop()?.replace('_', ' ')}` : 'Lokasi aktif'}
                    </span>
                  )}
                </div>

                {prayerData && (
                  <button
                    onClick={() => setShowAllTimings(!showAllTimings)}
                    className="text-[10px] font-bold text-emerald-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showAllTimings ? 'Tutup Jadwal' : 'Lihat Jadwal'}</span>
                    {showAllTimings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Collapsible Full Timings Grid */}
              {showAllTimings && prayerData && (
                <div className="border-t border-slate-200/50 dark:border-slate-800/60 mt-3 pt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 animate-scale-in text-center">
                  {(['subuh', 'syuruq', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const).map((key) => {
                    const time = prayerData.timings[key]
                    const label = key === 'subuh' ? 'Subuh' : key === 'syuruq' ? 'Syuruq' : key === 'dzuhur' ? 'Dzuhur' : key === 'ashar' ? 'Ashar' : key === 'maghrib' ? 'Maghrib' : 'Isya'
                    const isNext = nextPrayer?.key === key

                    return (
                      <div 
                        key={key} 
                        className={`p-1.5 rounded-xl border transition-colors ${
                          isNext 
                            ? 'bg-emerald-500/10 dark:bg-brand-500/10 border-emerald-500/25 dark:border-brand-500/20 text-emerald-800 dark:text-brand-350' 
                            : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-[9px] font-bold block opacity-75">{label}</span>
                        <span className="text-[10px] font-extrabold block mt-0.5">{time}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Maa Shaa Allah Banner */}
          {totalPrayedToday === 5 && isToday && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/60 dark:border-emerald-500/30 shadow-lg shadow-emerald-500/5 flex items-center justify-between gap-4 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Trophy className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900 dark:text-white text-xs sm:text-sm">Maa Shaa Allah!</h3>
                  <p className="text-emerald-800 dark:text-slate-400 text-[10px] sm:text-xs">Semua sholat hari ini telah diselesaikan. Pertahankan kebiasaan baik ini!</p>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold shrink-0">
                Sempurna 5/5
              </div>
            </div>
          )}

          {/* Mini Streak Summary */}
          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl transition-colors duration-300 shadow-[0_4px_20px_rgba(15,23,42,0.015)]">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 streak-fire" />
              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                Streak: <strong className="text-slate-900 dark:text-white">{stats.currentStreak} Hari</strong>
              </span>
            </div>
            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">Rekor Terbaik: {stats.longestStreak} Hari</span>
          </div>

          {/* Doa Hari Ini Card */}
          {(() => {
            const todayStr = getJakartaDateString()
            const [, , day] = todayStr.split('-').map(Number)
            const todayDoa = SHORT_DOAS[day % SHORT_DOAS.length]
            if (!todayDoa) return null
            return (
              <div className="glass-panel rounded-3xl p-5 relative overflow-hidden border border-emerald-100/40 dark:border-amber-500/20 bg-gradient-to-tr from-emerald-50/20 to-teal-50/10 dark:from-amber-950/10 dark:to-slate-900/40 shadow-md">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 dark:bg-amber-500/5 rounded-full blur-2xl -z-10" />
                <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-2 mb-3">
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-amber-400" />
                  <span className="text-[10px] text-emerald-600 dark:text-amber-400 font-extrabold uppercase tracking-widest">
                    Doa Hari Ini
                  </span>
                </div>
                <div className="space-y-3">
                  {/* Arab Text */}
                  <p className="text-right font-serif text-slate-900 dark:text-white text-lg sm:text-xl font-bold leading-loose select-all">
                    {todayDoa.arabic}
                  </p>
                  {/* Latin Text */}
                  <p className="text-xs text-emerald-700 dark:text-amber-400 italic pl-2.5 border-l-2 border-emerald-500 dark:border-amber-500 font-medium select-all">
                    {todayDoa.latin}
                  </p>
                  {/* Translation */}
                  <div className="space-y-0.5 select-all">
                    <p className="text-slate-650 dark:text-slate-350 text-[11px] leading-relaxed">
                      "{todayDoa.translation}"
                    </p>
                    {todayDoa.source && (
                      <p className="text-[9px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">
                        &mdash; {todayDoa.source}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Daily Tracker Checklist */}
          <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-brand-500/5 rounded-full blur-2xl -z-10" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] text-emerald-600 dark:text-brand-400 font-bold uppercase tracking-widest">
                  Pelacak Sholat Harian
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {getIndonesianDateString(selectedDate)}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getJakartaDateString()}
                  className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 rounded-lg px-2.5 py-1 focus:border-emerald-500 dark:focus:border-brand-500 outline-none cursor-pointer shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              {prayersList.map((prayer) => {
                const checked = !!currentLog[prayer.key]
                return (
                  <button
                    key={prayer.key}
                    onClick={() => onTogglePrayer(selectedDate, prayer.key)}
                    className={`w-full p-4 rounded-xl flex items-center justify-between transition-all duration-300 border text-left group cursor-pointer ${
                      checked
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 shadow-sm shadow-emerald-500/5'
                        : 'bg-white dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-850/80 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                        checked
                          ? 'bg-emerald-500 text-slate-950 scale-100'
                          : 'border-2 border-slate-300 dark:border-slate-700 group-hover:border-slate-450 dark:group-hover:border-slate-500 scale-95'
                      }`}>
                        {checked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3px]" />}
                      </div>
                      <div>
                        <span className={`text-sm font-bold transition-colors ${checked ? 'text-emerald-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                          {prayer.label}
                        </span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-500 ml-1.5">({prayer.time})</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      checked
                        ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-450'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500'
                    }`}>
                      {checked ? 'Sudah' : 'Belum'}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: STATISTIK */}
      {activeTab === 'stats' && (
        <div className="space-y-6 animate-fade-in">
          {/* Baris Atas: Streak & Konsistensi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Streak Panel */}
            <section className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col justify-between min-h-[150px] relative overflow-hidden transition-colors duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 dark:bg-amber-500/5 rounded-full blur-3xl -z-10" />
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-rose-600 dark:text-brand-400 font-bold uppercase tracking-widest">
                    Streak Saat Ini
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 dark:bg-amber-500/5 flex items-center justify-center">
                      <Flame className="w-5 h-5 streak-fire" />
                    </div>
                    <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {stats.currentStreak} <span className="text-sm font-medium text-slate-500 dark:text-slate-450">Hari</span>
                    </h3>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 dark:text-slate-500 font-semibold uppercase tracking-wider block">
                    Terbaik
                  </span>
                  <span className="text-xs font-bold text-rose-600 dark:text-amber-500 block mt-0.5">
                    🔥 {stats.longestStreak} Hari
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-650 dark:text-slate-400 mt-4 leading-relaxed bg-white/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                <span className="font-semibold text-slate-700 dark:text-slate-350">Definisi Streak:</span> Semua 5 sholat harian wajib diselesaikan penuh dalam satu hari kalender.
              </p>
            </section>

            {/* Monthly Consistency */}
            <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 relative overflow-hidden transition-colors duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -z-10" />
              <div>
                <span className="text-[10px] text-emerald-600 dark:text-brand-400 font-bold uppercase tracking-widest">
                  Konsistensi Bulan Ini
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {stats.monthlyCompletionRate}%
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">dari target 100%</span>
                </div>
              </div>

              {/* Glowing progress bar */}
              <div className="space-y-2">
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-250 dark:border-slate-850/80 relative">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, stats.monthlyCompletionRate)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-650 dark:text-slate-400">
                  <span>Total: <strong className="text-slate-800 dark:text-slate-200">{stats.totalChecked}</strong> dari {stats.totalEligible} sholat</span>
                  <span>Target: 5 Waktu / Hari</span>
                </div>
              </div>
            </section>
          </div>

          {/* Heatmap Grid Panel */}
          <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-brand-400" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                  Heatmap Keistiqomahan (20 Minggu Terakhir)
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 dark:text-slate-455 self-start sm:self-center">
                <span>Bolong</span>
                <div className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-800" />
                <div className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 dark:bg-amber-500/30" />
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 dark:bg-emerald-600/50" />
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-50 shadow-[0_0_4px_rgba(16,185,129,0.2)]" />
                <span>5 Waktu</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
              <div className="min-w-[580px] grid grid-flow-col auto-cols-max gap-1">
                {/* Days labels */}
                <div className="grid grid-rows-7 gap-1 text-[8px] text-slate-550 dark:text-slate-500 font-semibold pr-2 select-none">
                  <span className="h-3.5 flex items-center">Ahad</span>
                  <span className="h-3.5 flex items-center">Sen</span>
                  <span className="h-3.5 flex items-center">Sel</span>
                  <span className="h-3.5 flex items-center">Rab</span>
                  <span className="h-3.5 flex items-center">Kam</span>
                  <span className="h-3.5 flex items-center">Jum</span>
                  <span className="h-3.5 flex items-center">Sab</span>
                </div>

                {/* Weeks */}
                {heatmapWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="grid grid-rows-7 gap-1">
                    {week.map((cell) => (
                      <button
                        key={cell.date}
                        onClick={() => {
                          setSelectedDate(cell.date)
                          setActiveTab('tracker')
                        }}
                        className={`w-3.5 h-3.5 rounded-[3px] border transition-all duration-150 heatmap-tooltip cursor-pointer ${getHeatmapColorClass(cell.count)} ${
                          selectedDate === cell.date ? 'ring-2 ring-emerald-500 dark:ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 scale-110' : 'border-slate-300/40 dark:border-transparent'
                        }`}
                        data-tooltip={`${cell.formattedDate}: ${cell.count} sholat`}
                        aria-label={`Sholat ${cell.date}: ${cell.count} dari 5`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Month labels at bottom */}
              <div className="min-w-[580px] pl-[34px] flex mt-1.5 text-[8px] text-slate-550 dark:text-slate-500 font-semibold tracking-wider select-none uppercase">
                {monthLabels.map((label, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${label.colSpan * 18}px` }}
                    className="truncate"
                  >
                    {label.text}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Breakdown Konsistensi Sholat Panel */}
          <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 transition-colors duration-300">
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-brand-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                Breakdown Konsistensi Sholat
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              {(['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const).map((key) => {
                const percentage = stats.prayerConsistency[key] || 0
                const label = key.charAt(0).toUpperCase() + key.slice(1)
                
                const sholatIcons: Record<string, React.ReactNode> = {
                  subuh: <Cloud className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />,
                  dzuhur: <Sun className="w-3.5 h-3.5 text-amber-500" />,
                  ashar: <Sun className="w-3.5 h-3.5 text-orange-400 dark:text-orange-500" />,
                  maghrib: <Moon className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-500" />,
                  isya: <Moon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                }
                
                return (
                  <div 
                    key={key} 
                    className="bg-white/50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {sholatIcons[key]}
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-250">{label}</span>
                        </div>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-brand-400">{percentage}%</span>
                      </div>
                      <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-0.5">Konsistensi</p>
                    </div>

                    <div className="mt-4 space-y-1">
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden relative border border-slate-250/20 dark:border-slate-850/40">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 dark:from-amber-600 dark:to-amber-400 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Progress Comparison */}
          <section className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 dark:bg-brand-500/5 rounded-full blur-3xl -z-10" />
            
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-brand-400" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                Perbandingan Progres & Tren
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between transition-colors shadow-sm">
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Bulan Lalu</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                    {Math.round(stats.monthlyCompletionRate - stats.comparisonGrowth)}%
                  </h4>
                  <span className="text-[9px] text-slate-450 dark:text-slate-500">konsistensi</span>
                </div>
              </div>

              <div className="bg-white/50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden transition-colors shadow-sm">
                <span className="text-[10px] font-semibold text-slate-550 dark:text-slate-400">Bulan Ini</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <h4 className="text-xl font-bold text-slate-950 dark:text-white">
                    {stats.monthlyCompletionRate}%
                  </h4>
                  <span className="text-[9px] text-emerald-600 dark:text-brand-400 font-semibold">Terkini</span>
                </div>
              </div>

              <div className={`border rounded-xl p-4 flex flex-col justify-between transition-colors shadow-sm ${
                stats.comparisonGrowth >= 0 
                  ? 'bg-emerald-50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/30 text-emerald-850 dark:text-emerald-300' 
                  : 'bg-rose-50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/30 text-rose-850 dark:text-rose-300'
              }`}>
                <span className="text-[10px] font-semibold">Tren Pertumbuhan</span>
                <div className="mt-1 flex items-center gap-2">
                  <h4 className="text-2xl font-extrabold tracking-tight">
                    {stats.comparisonGrowth >= 0 ? `+${stats.comparisonGrowth}%` : `${stats.comparisonGrowth}%`}
                  </h4>
                  {stats.comparisonGrowth >= 0 ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-rose-500/20 dark:bg-rose-500/20 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">
                      <TrendingDown className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: DOA-DOA HARIAN */}
      {activeTab === 'doa' && (
        <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari doa harian..."
              value={doaSearch}
              onChange={(e) => setDoaSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 dark:focus:border-brand-500 rounded-xl text-xs sm:text-sm text-slate-850 dark:text-white placeholder-slate-400 outline-none transition-all duration-300 shadow-sm"
            />
          </div>

          {/* Doa Cards List */}
          <div className="space-y-3.5">
            {filteredDoas.length > 0 ? (
              filteredDoas.map((doa) => {
                const isExpanded = expandedDoaId === doa.id
                return (
                  <div 
                    key={doa.id}
                    className="glass-panel rounded-2xl overflow-hidden transition-all duration-300 border border-slate-200 dark:border-slate-800/80"
                  >
                    <button
                      onClick={() => setExpandedDoaId(isExpanded ? null : doa.id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      <div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-brand-400 text-[9px] font-bold uppercase tracking-wider">
                          {doa.category}
                        </span>
                        <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm sm:text-base mt-1.5">
                          {doa.title}
                        </h4>
                      </div>
                      <div className="text-slate-400 shrink-0">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-slate-200 dark:border-slate-800/60 bg-white/30 dark:bg-slate-950/20 space-y-4 animate-scale-in">
                        {/* Arab */}
                        <div className="text-right py-4 font-serif text-slate-900 dark:text-white text-xl sm:text-2xl leading-loose font-bold tracking-wide select-all">
                          {doa.arabic}
                        </div>
                        {/* Latin */}
                        <div className="text-xs sm:text-sm text-emerald-700 dark:text-brand-350 italic pl-3 border-l-2 border-emerald-500 dark:border-brand-500 font-medium select-all">
                          {doa.latin}
                        </div>
                        {/* Translation */}
                        <div className="space-y-1 select-all">
                          <span className="text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Artinya:</span>
                          <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-350 leading-relaxed">
                            "{doa.translation}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-slate-550 text-xs">
                Tidak ada doa yang cocok dengan pencarian Anda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PENGATURAN */}
      {activeTab === 'settings' && (
        <section className="space-y-6 max-w-xl mx-auto animate-fade-in">
          {/* Card Profil Pengguna */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 transition-colors duration-300">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm sm:text-base border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <User className="w-4.5 h-4.5 text-emerald-600 dark:text-brand-400" />
              <span>Profil Pengguna</span>
            </h3>

            {profileMessage && (
              <div className={`p-3.5 rounded-xl text-xs border ${
                profileMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-850 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-850 dark:text-rose-300'
              }`}>
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleSaveProfileName} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="profile-name" className="block text-[10px] font-bold text-slate-500 uppercase">Nama Profil</label>
                <input
                  type="text"
                  id="profile-name"
                  placeholder="Masukkan nama Anda..."
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-105 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-brand-500 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-250">
                <Cloud className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong className="block mb-0.5 text-slate-850 dark:text-white">Sinkronisasi Database Aktif</strong>
                  Seluruh log ibadah Anda telah tersinkronisasi dan dicadangkan secara aman di cloud Supabase untuk email <strong>{user?.email}</strong>.
                </div>
              </div>

              <button
                type="submit"
                disabled={profileLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:bg-brand-500 dark:hover:bg-brand-600 text-slate-950 font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-emerald-500/10 dark:shadow-brand-500/10 cursor-pointer"
              >
                {profileLoading ? 'Menyimpan...' : 'Simpan Nama Profil'}
              </button>
            </form>
          </div>

          {/* Card PIN Keamanan */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 transition-colors duration-300 animate-fade-in">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm sm:text-base border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 dark:text-brand-400" />
              <span>PIN Keamanan</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-405 leading-relaxed">
              Atur 6 digit PIN numerik untuk masuk secara cepat tanpa menggunakan Magic Link email di masa mendatang.
            </p>

            {pinMessage && (
              <div className={`p-3.5 rounded-xl text-xs border ${
                pinMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
              }`}>
                {pinMessage.text}
              </div>
            )}

            <form onSubmit={handleSavePin} className="space-y-4 pt-1 max-w-sm">
              <div className="space-y-1.5">
                <label htmlFor="settings-pin" className="block text-[10px] font-bold text-slate-500 uppercase">PIN Baru (6 Digit Angka)</label>
                <input
                  type="password"
                  id="settings-pin"
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full px-3.5 py-2.5 bg-slate-105 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl text-xs outline-none focus:border-emerald-500 dark:focus:border-brand-500 tracking-widest"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={pinLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:bg-brand-500 dark:hover:bg-brand-600 text-slate-950 font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-emerald-500/10 dark:shadow-brand-500/10 cursor-pointer"
              >
                {pinLoading ? 'Menyimpan...' : 'Simpan PIN Keamanan'}
              </button>
            </form>
          </div>

          {/* Card Pengaturan Tema Tampilan */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 transition-colors duration-300">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm sm:text-base border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <Sun className="w-4.5 h-4.5 text-emerald-600 dark:text-brand-400" />
              <span>Tema Tampilan</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-405">
              Pilih tema warna aplikasi atau sesuaikan secara otomatis dengan pengaturan sistem perangkat Anda.
            </p>
            
            {/* Segmented Control */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-105 dark:bg-slate-950 border border-slate-250 dark:border-slate-850 rounded-xl">
              <button
                onClick={() => onChangeThemeMode('light')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-450 hover:text-slate-850 dark:hover:text-slate-250'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Terang</span>
              </button>
              <button
                onClick={() => onChangeThemeMode('dark')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-455 hover:text-slate-850 dark:hover:text-slate-250'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Gelap</span>
              </button>
              <button
                onClick={() => onChangeThemeMode('system')}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'system'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700'
                    : 'text-slate-500 dark:text-slate-450 hover:text-slate-850 dark:hover:text-slate-250'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Sistem</span>
              </button>
            </div>
          </div>


          {/* Card Tentang Aplikasi */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 transition-colors duration-300">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm sm:text-base border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <Info className="w-4.5 h-4.5 text-emerald-600 dark:text-brand-400" />
              <span>Tentang Rakaat</span>
            </h3>
            <div className="space-y-3 text-[11px] text-slate-550 dark:text-slate-405 leading-relaxed">
              <p>
                <strong>Rakaat</strong> adalah jurnal pelacak ibadah pribadi yang dirancang untuk membantu Anda memahami dan menumbuhkan konsistensi sholat wajib secara privat.
              </p>
              <p className="italic border-l-2 border-emerald-500 dark:border-brand-500 pl-3 py-1 my-3 text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/30">
                "Lihat perjalanan istiqomahmu, satu rakaat demi satu rakaat."
              </p>
              <p>
                Versi: 1.0.0 (MVP) <br />
                Teknologi: React, Tailwind CSS, Vite PWA, Supabase Database
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Quote Refleksi */}
      <footer className="text-center py-6 text-slate-500 text-xs">
        <p className="italic">"Lihat perjalanan istiqomahmu, satu rakaat demi satu rakaat."</p>
        <p className="mt-1.5 text-[10px]">Rakaat &copy; {new Date().getFullYear()} &mdash; Pelacak Refleksi Pribadi</p>
      </footer>
    </main>
  )
}
