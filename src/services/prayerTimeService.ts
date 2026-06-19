export interface PrayerTimings {
  subuh: string;
  syuruq: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export interface HijriDate {
  day: string;
  monthEn: string;
  monthAr: string;
  year: string;
}

export interface PrayerTimeData {
  timings: PrayerTimings;
  timezone: string;
  hijri: HijriDate;
  readableDate: string;
}

export const fetchPrayerTimings = async (lat: number, lng: number): Promise<PrayerTimeData> => {
  const timestamp = Math.floor(Date.now() / 1000)
  const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=20`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Gagal mengambil jadwal sholat dari server.')
  }

  const result = await response.json()
  if (result.code !== 200 || !result.data) {
    throw new Error('Format data jadwal sholat tidak valid.')
  }

  const { timings, date, meta } = result.data
  return {
    timings: {
      subuh: timings.Fajr,
      syuruq: timings.Sunrise,
      dzuhur: timings.Dhuhr,
      ashar: timings.Asr,
      maghrib: timings.Maghrib,
      isya: timings.Isha
    },
    timezone: meta.timezone,
    hijri: {
      day: date.hijri.day,
      monthEn: date.hijri.month.en,
      monthAr: date.hijri.month.ar,
      year: date.hijri.year
    },
    readableDate: date.readable
  }
}

const getSecondsFromTimeStr = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 3600 + m * 60
}

/**
 * Calculates the countdown in seconds and the name of the next prayer
 */
export const getNextPrayer = (
  timings: PrayerTimings,
  timezone: string
): { name: string; key: keyof PrayerTimings; timeStr: string; remainingSeconds: number } => {
  const now = new Date()
  
  // Get target timezone parts
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  const formatted = formatter.format(now) // YYYY-MM-DD HH:MM:SS
  const [, timePart] = formatted.split(' ')
  const [currentHour, currentMinute, currentSecond] = timePart.split(':').map(Number)
  
  const currentTotalSeconds = currentHour * 3600 + currentMinute * 60 + currentSecond

  // Map of 5 obligatory prayers sorted chronologically
  const prayerList: { name: string; key: keyof PrayerTimings; timeStr: string; seconds: number }[] = [
    { name: 'Subuh', key: 'subuh', timeStr: timings.subuh, seconds: getSecondsFromTimeStr(timings.subuh) },
    { name: 'Dzuhur', key: 'dzuhur', timeStr: timings.dzuhur, seconds: getSecondsFromTimeStr(timings.dzuhur) },
    { name: 'Ashar', key: 'ashar', timeStr: timings.ashar, seconds: getSecondsFromTimeStr(timings.ashar) },
    { name: 'Maghrib', key: 'maghrib', timeStr: timings.maghrib, seconds: getSecondsFromTimeStr(timings.maghrib) },
    { name: 'Isya', key: 'isya', timeStr: timings.isya, seconds: getSecondsFromTimeStr(timings.isya) }
  ]

  // Find the first prayer where its time is greater than current time
  const next = prayerList.find((p) => p.seconds > currentTotalSeconds)

  if (next) {
    return {
      name: next.name,
      key: next.key,
      timeStr: next.timeStr,
      remainingSeconds: next.seconds - currentTotalSeconds
    }
  } else {
    // If past Isya, next prayer is Subuh tomorrow
    const firstPrayer = prayerList[0] // Subuh
    const secondsInADay = 24 * 3600
    const remaining = (secondsInADay - currentTotalSeconds) + firstPrayer.seconds
    return {
      name: firstPrayer.name,
      key: firstPrayer.key,
      timeStr: firstPrayer.timeStr,
      remainingSeconds: remaining
    }
  }
}

export const formatRemainingTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (num: number) => String(num).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
