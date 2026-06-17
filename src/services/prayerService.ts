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
          console.error('Failed to parse local prayer logs', e)
          return []
        }
      }
      return []
    }

    try {
      const { data, error } = await supabase
        .from('prayer_logs')
        .select('date, subuh, dzuhur, ashar, maghrib, isya')
        .eq('user_id', userId)
        .order('date', { ascending: true })

      if (error) throw error
      return (data || []) as PrayerLog[]
    } catch (error) {
      console.error('Error fetching logs from Supabase, falling back to LocalStorage:', error)
      // Fallback to local storage if DB query fails
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY)
      return localData ? JSON.parse(localData) : []
    }
  },

  /**
   * Toggle a prayer status for a specific date
   */
  async togglePrayer(
    userId: string | null,
    date: string,
    prayer: 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya'
  ): Promise<PrayerLog[]> {
    // 1. Fetch current logs first
    const logs = await this.getLogs(userId)
    const existingIndex = logs.findIndex((l) => l.date === date)
    
    let updatedLog: PrayerLog
    if (existingIndex > -1) {
      updatedLog = {
        ...logs[existingIndex],
        [prayer]: !logs[existingIndex][prayer],
      }
    } else {
      updatedLog = getEmptyLog(date)
      updatedLog[prayer] = true
    }

    const newLogs = [...logs]
    if (existingIndex > -1) {
      newLogs[existingIndex] = updatedLog
    } else {
      newLogs.push(updatedLog)
      newLogs.sort((a, b) => a.date.localeCompare(b.date))
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

    // Get today and yesterday dates in local time zone
    const now = new Date()
    const formatDateStr = (d: Date) => d.toISOString().split('T')[0]

    // Build map for quick access
    const completedDatesMap = new Set<string>()
    logs.forEach((log) => {
      if (isDayCompleted(log)) {
        completedDatesMap.add(log.date)
      }
    })

    // Calculate streaks by counting backward from today or yesterday
    // If today is completed, streak starts today. Otherwise, if yesterday is completed, streak starts yesterday.
    const checkDate = new Date(now)
    let checkDateStr = formatDateStr(checkDate)

    // If today is not completed, we check yesterday.
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
    // We sort all dates and find consecutive ranges
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

    // Monthly completion calculations
    const currentMonth = now.getMonth() // 0-11
    const currentYear = now.getFullYear()
    
    // Get total logged prayers in the current month
    const thisMonthLogs = sortedLogs.filter((log) => {
      const logDate = new Date(log.date)
      return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear
    })

    let totalChecked = 0
    thisMonthLogs.forEach((log) => {
      if (log.subuh) totalChecked++
      if (log.dzuhur) totalChecked++
      if (log.ashar) totalChecked++
      if (log.maghrib) totalChecked++
      if (log.isya) totalChecked++
    })

    // Total possible prayers in this month so far: days in month elapsed * 5
    // But let's check: if we started tracking, count days from first log in this month or from start of month
    // To keep it simple and fair, total eligible = days elapsed in current month * 5
    const daysElapsed = now.getDate()
    const totalEligible = daysElapsed * 5
    const monthlyCompletionRate = totalEligible > 0 ? Math.round((totalChecked / totalEligible) * 100) : 0

    // Comparison Growth: Compare current month rate vs last month rate
    const lastMonthDate = new Date(now)
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
    const lastMonth = lastMonthDate.getMonth()
    const lastMonthYear = lastMonthDate.getFullYear()

    const lastMonthLogs = sortedLogs.filter((log) => {
      const logDate = new Date(log.date)
      return logDate.getMonth() === lastMonth && logDate.getFullYear() === lastMonthYear
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

    return {
      currentStreak,
      longestStreak,
      monthlyCompletionRate,
      totalChecked,
      totalEligible,
      comparisonGrowth,
    }
  }
}
