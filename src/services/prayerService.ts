import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

export interface PrayerLog {
  date: string; // YYYY-MM-DD
  subuh: boolean;
  dzuhur: boolean;
  ashar: boolean;
  maghrib: boolean;
  isya: boolean;
}

const LOCAL_STORAGE_KEY = 'rakaat_guest_prayer_logs'

// Helper to get default empty log for a date
export const getEmptyLog = (date: string): PrayerLog => ({
  date,
  subuh: false,
  dzuhur: false,
  ashar: false,
  maghrib: false,
  isya: false,
})

/**
 * Helper to get date string formatted YYYY-MM-DD in Asia/Jakarta (GMT+7) timezone
 */
export const getJakartaDateString = (d: Date = new Date()): string => {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

export const prayerService = {
  /**
   * Fetch logs for a user (or local storage if guest)
   */
  async getLogs(userId: string | null): Promise<PrayerLog[]> {
    if (!userId || !isSupabaseConfigured || !supabase) {
      // Return guest logs from LocalStorage
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (localData) {
        try {
          return JSON.parse(localData) as PrayerLog[]
        } catch (e) {
          console.error('Failed to parse local prayer logs:', e)
          return []
        }
      }
      return []
    }

    try {
      const { data, error } = await supabase
        .from('prayer_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })

      if (error) throw error
      return (data || []) as PrayerLog[]
    } catch (e) {
      console.error('Error fetching logs from Supabase:', e)
      // Fallback to local storage if supabase fails
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY)
      return localData ? JSON.parse(localData) as PrayerLog[] : []
    }
  },

  /**
   * Check or uncheck a prayer log
   */
  async togglePrayer(
    userId: string | null,
    date: string,
    prayer: 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya'
  ): Promise<PrayerLog[]> {
    const logs = await this.getLogs(userId)
    const existingLogIndex = logs.findIndex((l) => l.date === date)

    let updatedLog: PrayerLog
    if (existingLogIndex >= 0) {
      updatedLog = {
        ...logs[existingLogIndex],
        [prayer]: !logs[existingLogIndex][prayer],
      }
    } else {
      updatedLog = {
        ...getEmptyLog(date),
        [prayer]: true,
      }
    }

    const newLogs = [...logs]
    if (existingLogIndex >= 0) {
      newLogs[existingLogIndex] = updatedLog
    } else {
      newLogs.push(updatedLog)
    }

    // 2. Persist to LocalStorage (always save locally as a backup/offline cache)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newLogs))

    // 3. Persist to Supabase if logged in
    if (userId && isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('prayer_logs')
          .upsert(
            {
              user_id: userId,
              date: date,
              subuh: updatedLog.subuh,
              dzuhur: updatedLog.dzuhur,
              ashar: updatedLog.ashar,
              maghrib: updatedLog.maghrib,
              isya: updatedLog.isya,
            },
            { onConflict: 'user_id,date' }
          )

        if (error) throw error
      } catch (error) {
        console.error('Error syncing log to Supabase:', error)
      }
    }

    return newLogs
  },

  /**
   * Sync guest logs to Supabase upon login
   */
  async syncGuestLogs(userId: string): Promise<PrayerLog[]> {
    if (!isSupabaseConfigured || !supabase) return []

    const localData = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!localData) return this.getLogs(userId)

    try {
      const guestLogs = JSON.parse(localData) as PrayerLog[]
      if (guestLogs.length === 0) return this.getLogs(userId)

      // Fetch existing DB logs to merge
      const dbLogs = await this.getLogs(userId)
      const mergedLogsMap = new Map<string, PrayerLog>()

      // Add DB logs first
      dbLogs.forEach((log) => mergedLogsMap.set(log.date, log))

      // Merge guest logs (guest logs override if they have active prayers or if it is newer)
      guestLogs.forEach((gLog) => {
        const dbLog = mergedLogsMap.get(gLog.date)
        if (!dbLog) {
          mergedLogsMap.set(gLog.date, gLog)
        } else {
          // Merge toggles: if either is true, keep it true (or prioritize guest for merge)
          mergedLogsMap.set(gLog.date, {
            date: gLog.date,
            subuh: gLog.subuh || dbLog.subuh,
            dzuhur: gLog.dzuhur || dbLog.dzuhur,
            ashar: gLog.ashar || dbLog.ashar,
            maghrib: gLog.maghrib || dbLog.maghrib,
            isya: gLog.isya || dbLog.isya,
          })
        }
      })

      const mergedLogs = Array.from(mergedLogsMap.values()).sort((a, b) => a.date.localeCompare(b.date))

      // Bulk upsert to Supabase
      const upsertData = mergedLogs.map((log) => ({
        user_id: userId,
        date: log.date,
        subuh: log.subuh,
        dzuhur: log.dzuhur,
        ashar: log.ashar,
        maghrib: log.maghrib,
        isya: log.isya,
      }))

      const { error } = await supabase
        .from('prayer_logs')
        .upsert(upsertData, { onConflict: 'user_id,date' })

      if (error) throw error

      // Update LocalStorage with the synced version
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedLogs))
      return mergedLogs
    } catch (e) {
      console.error('Failed to sync guest logs to Supabase:', e)
      return this.getLogs(userId)
    }
  },

  /**
   * Calculate streaks and statistics
   */
  calculateStats(logs: PrayerLog[]) {
    if (logs.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        monthlyCompletionRate: 0,
        totalChecked: 0,
        totalEligible: 0,
        comparisonGrowth: 0,
        prayerConsistency: {
          subuh: 0,
          dzuhur: 0,
          ashar: 0,
          maghrib: 0,
          isya: 0,
        }
      }
    }

    // Sort logs by date ascending
    const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date))

    // Helper: is a day fully completed? (all 5 prayers checked)
    const isDayCompleted = (log: PrayerLog) =>
      log.subuh && log.dzuhur && log.ashar && log.maghrib && log.isya

    // Calculate streaks
    let currentStreak = 0
    let longestStreak = 0

    // Get today and yesterday dates in Jakarta time zone (GMT+7)
    const now = new Date()
    const formatDateStr = (d: Date) => getJakartaDateString(d)

    // Build map for quick access
    const completedDatesMap = new Set<string>()
    logs.forEach((log) => {
      if (isDayCompleted(log)) {
        completedDatesMap.add(log.date)
      }
    })

    // Calculate streaks by counting backward from today or yesterday
    const checkDate = new Date(now)
    let checkDateStr = formatDateStr(checkDate)

    if (!completedDatesMap.has(checkDateStr)) {
      checkDate.setDate(checkDate.getDate() - 1)
      checkDateStr = formatDateStr(checkDate)
    }

    while (completedDatesMap.has(checkDateStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
      checkDateStr = formatDateStr(checkDate)
    }

    // Longest streak calculation across all logs
    const activeDates = Array.from(completedDatesMap).sort()
    if (activeDates.length > 0) {
      let currentSeq = 1
      longestStreak = 1
      for (let i = 1; i < activeDates.length; i++) {
        const d1 = new Date(activeDates[i - 1])
        const d2 = new Date(activeDates[i])
        const diffTime = Math.abs(d2.getTime() - d1.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          currentSeq++
        } else {
          currentSeq = 1
        }
        if (currentSeq > longestStreak) {
          longestStreak = currentSeq
        }
      }
      if (longestStreak < currentStreak) {
        longestStreak = currentStreak
      }
    }

    // Monthly completion calculations in Jakarta time zone
    const jakartaTodayStr = getJakartaDateString(now)
    const [currentYear, currentMonth, currentDay] = jakartaTodayStr.split('-').map(Number)

    // Get total logged prayers in the current month
    const thisMonthLogs = sortedLogs.filter((log) => {
      const [y, m] = log.date.split('-').map(Number)
      return m === currentMonth && y === currentYear
    })

    let totalChecked = 0
    thisMonthLogs.forEach((log) => {
      if (log.subuh) totalChecked++
      if (log.dzuhur) totalChecked++
      if (log.ashar) totalChecked++
      if (log.maghrib) totalChecked++
      if (log.isya) totalChecked++
    })

    const daysElapsed = currentDay
    const totalEligible = daysElapsed * 5
    const monthlyCompletionRate = totalEligible > 0 ? Math.round((totalChecked / totalEligible) * 100) : 0

    // Comparison Growth: Compare current month rate vs last month rate
    let lastMonth = currentMonth - 1 - 1 // convert 1-12 to 0-11 index, then -1 for last month
    let lastMonthYear = currentYear
    if (lastMonth < 0) {
      lastMonth = 11
      lastMonthYear--
    }

    const lastMonthLogs = sortedLogs.filter((log) => {
      const [y, m] = log.date.split('-').map(Number)
      return (m - 1) === lastMonth && y === lastMonthYear
    })

    let lastMonthChecked = 0
    lastMonthLogs.forEach((log) => {
      if (log.subuh) lastMonthChecked++
      if (log.dzuhur) lastMonthChecked++
      if (log.ashar) lastMonthChecked++
      if (log.maghrib) lastMonthChecked++
      if (log.isya) lastMonthChecked++
    })

    // Days in last month
    const daysInLastMonth = new Date(lastMonthYear, lastMonth + 1, 0).getDate()
    const lastMonthEligible = daysInLastMonth * 5
    const lastMonthCompletionRate = lastMonthEligible > 0 ? Math.round((lastMonthChecked / lastMonthEligible) * 100) : 0

    const comparisonGrowth = monthlyCompletionRate - lastMonthCompletionRate

    // Calculate consistency per prayer over all logs
    const totalDays = logs.length
    let subuhCount = 0
    let dzuhurCount = 0
    let asharCount = 0
    let maghribCount = 0
    let isyaCount = 0

    logs.forEach((log) => {
      if (log.subuh) subuhCount++
      if (log.dzuhur) dzuhurCount++
      if (log.ashar) asharCount++
      if (log.maghrib) maghribCount++
      if (log.isya) isyaCount++
    })

    const prayerConsistency = {
      subuh: totalDays > 0 ? Math.round((subuhCount / totalDays) * 100) : 0,
      dzuhur: totalDays > 0 ? Math.round((dzuhurCount / totalDays) * 100) : 0,
      ashar: totalDays > 0 ? Math.round((asharCount / totalDays) * 100) : 0,
      maghrib: totalDays > 0 ? Math.round((maghribCount / totalDays) * 100) : 0,
      isya: totalDays > 0 ? Math.round((isyaCount / totalDays) * 100) : 0,
    }

    return {
      currentStreak,
      longestStreak,
      monthlyCompletionRate,
      totalChecked,
      totalEligible,
      comparisonGrowth,
      prayerConsistency,
    }
  }
}
