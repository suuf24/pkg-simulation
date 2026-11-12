/* Perhitungan penilaian kinerja guru.
 * Dipakai bersama oleh antarmuka (app.js) dan dokumen PDF (report.js).
 */

export const HARI_EFEKTIF = 46
export const MENIT_PER_HARI = 450

/* Referensi dari sheet REF, DATA, dan KH pada PKG.xlsm */
export const AKTIVITAS_PKB = [
  { kode: '1.1', nama: 'Diklat fungsional', unsur: '1. Pengembangan Diri' },
  { kode: '1.2', nama: 'Kegiatan lokakarya atau kegiatan kelompok guru', unsur: '1. Pengembangan Diri' },
  { kode: '1.3', nama: 'Pembahas atau peserta pada seminar, koloqium, atau diskusi pannel', unsur: '1. Pengembangan Diri' },
  { kode: '1.4', nama: 'Kegiatan kolektif guru (MGMP/MGBK/KKG)', unsur: '1. Pengembangan Diri' },
  { kode: '2.1', nama: 'Presentasi pada forum ilmiah', unsur: '2. Publikasi Ilmiah' },
  { kode: '2.2', nama: 'Sebagai pemrasaran/nara sumber pada seminar, lokakarya ilmiah, koloqium atau diskusi ilmiah', unsur: '2. Publikasi Ilmiah' },
  { kode: '2.3', nama: 'Publikasi ilmiah hasil penelitian atau gagasan inovatif pada bidang pendidikan formal', unsur: '2. Publikasi Ilmiah' },
  { kode: '3.1', nama: 'Penemuan teknologi tepat guna', unsur: '3. Karya Inovatif' },
  { kode: '3.2', nama: 'Penemuan/peciptaan atau pengembangan karya seni', unsur: '3. Karya Inovatif' },
  { kode: '3.3', nama: 'Pembuatan/pemodifikasian alat pelajaran/peraga/praktikum', unsur: '3. Karya Inovatif' },
  { kode: '3.4', nama: 'Penyusunan standar, pedoman, soal dan sejenisnya', unsur: '3. Karya Inovatif' },
]

export const GOLONGAN = {
  'Penata Muda, III/a': { ak: 50, diri: 3, publikasi: 0, penunjang: 5 },
  'Penata Muda Tk. I, III/b': { ak: 50, diri: 3, publikasi: 4, penunjang: 5 },
  'Penata, III/c': { ak: 100, diri: 3, publikasi: 6, penunjang: 10 },
  'Penata Tk. I, III/d': { ak: 100, diri: 4, publikasi: 8, penunjang: 15 },
  'Pembina, IV/a': { ak: 150, diri: 4, publikasi: 12, penunjang: 15 },
  'Pembina Tk. I, IV/b': { ak: 150, diri: 4, publikasi: 12, penunjang: 15 },
  'Pembina Utama Muda, IV/c': { ak: 150, diri: 5, publikasi: 14, penunjang: 20 },
  'Pembina Utama Madya, IV/d': { ak: 200, diri: 5, publikasi: 14, penunjang: 20 },
  'Pembina Utama, IV/e': { ak: 200, diri: 5, publikasi: 14, penunjang: 20 },
}

/* Pangkat kini diisi sebagai teks bebas; ambil besaran AK dari kode golongan
 * (mis. "III/a") agar perhitungan tetap berjalan walau sebutan berbeda. */
export function golonganOf(pangkat) {
  const kosong = { ak: 0, diri: 0, publikasi: 0, penunjang: 0 }
  const value = String(pangkat || '').trim()
  if (!value) return kosong
  if (GOLONGAN[value]) return GOLONGAN[value]
  const rapat = value.toLowerCase().replace(/\s+/g, ' ')
  const persis = Object.keys(GOLONGAN).find((k) => k.toLowerCase() === rapat)
  if (persis) return GOLONGAN[persis]
  const kode = value.match(/(I{1,3}|IV)\s*\/\s*([a-e])/i)
  if (kode) {
    const pola = `${kode[1].toLowerCase()}/${kode[2].toLowerCase()}`
    const kunci = Object.keys(GOLONGAN).find((k) => k.toLowerCase().includes(pola))
    if (kunci) return GOLONGAN[kunci]
  }
  return kosong
}

export const JAM_TUGAS = {
  'Kepala Madrasah': 24,
  'Waka Kurikulum': 12,
  'Waka Kesiswaan': 12,
  'Waka Humas': 12,
  'Waka Sarpras': 12,
  'Kepala Perpustakaan': 12,
  'Kepala Lab. Biologi': 12,
  'Kepala Lab. Fisika': 12,
  'Kepala Lab. Kimia': 12,
  'Kepala Lab. Bahasa': 12,
  'Kepala Lab. IPS': 12,
  'Kepala Lab. IPA': 12,
  'Kepala Lab. Agama': 12,
  'Kepala Lab. TIK': 12,
  'Wali Kelas': 6,
  'Pembina Ekstrakurikuler': 6,
  'Guru Piket': 1,
  '-': 0,
}

export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
  'Agustus', 'September', 'Oktober', 'November', 'Desember']

/* ------------------------------------------------------------------ */
/* Skor instrumen                                                      */
/* ------------------------------------------------------------------ */

export const answerOf = (jawaban, instId, sIdx, iIdx) => jawaban[instId]?.[`${sIdx}:${iIdx}`] ?? null
export const lastOption = (item) => item.options[item.options.length - 1].score

export function sectionStats(inst, sIdx, jawaban) {
  const section = inst.sections[sIdx]
  let total = 0
  let answered = 0
  section.items.forEach((item, iIdx) => {
    const v = answerOf(jawaban, inst.id, sIdx, iIdx)
    if (v !== null) {
      total += v
      answered += 1
    }
  })
  const max = section.items.length * 2
  return {
    total,
    max,
    answered,
    items: section.items.length,
    pct: max ? (total / max) * 100 : 0,
  }
}

export function instrumentStats(inst, jawaban) {
  let total = 0
  let max = 0
  let answered = 0
  let items = 0
  inst.sections.forEach((_s, i) => {
    const st = sectionStats(inst, i, jawaban)
    total += st.total
    max += st.max
    answered += st.answered
    items += st.items
  })
  const pct = max ? (total / max) * 100 : 0
  return { total, max, answered, items, pct, grade: answered ? gradeOf(pct) : null }
}

/* N-GR!: IF(pct<1,0, IF(pct<26,1, IF(pct<51,2, IF(pct<76,3, IF(pct<=100,4,0))))) */
export function gradeOf(pct) {
  if (pct < 1) return 0
  if (pct < 26) return 1
  if (pct < 51) return 2
  if (pct < 76) return 3
  if (pct <= 100) return 4
  return 0
}

export function predikatOf(pct) {
  if (pct >= 91) return 'Amat Baik'
  if (pct >= 76) return 'Baik'
  if (pct >= 61) return 'Cukup'
  if (pct >= 51) return 'Sedang'
  return 'Kurang'
}

export function rekapRows(instruments, jawaban) {
  return instruments.map((inst) => {
    const st = instrumentStats(inst, jawaban)
    return { inst, ...st }
  })
}

export function finalScore(instruments, jawaban) {
  const filled = rekapRows(instruments, jawaban).filter((r) => r.answered > 0)
  if (!filled.length) return null
  const pct = filled.reduce((acc, r) => acc + r.pct, 0) / filled.length
  return { pct, predikat: predikatOf(pct), count: filled.length }
}

export function overallProgress(instruments, jawaban) {
  let done = 0
  let all = 0
  instruments.forEach((inst) => {
    const st = instrumentStats(inst, jawaban)
    done += st.answered
    all += st.items
  })
  return { done, all, pct: all ? (done / all) * 100 : 0 }
}

export function prioritasRows(inst, jawaban, limit = 12) {
  if (!inst) return []
  const rows = []
  inst.sections.forEach((section, sIdx) => {
    section.items.forEach((item, iIdx) => {
      const v = answerOf(jawaban, inst.id, sIdx, iIdx)
      const max = lastOption(item)
      if (v !== null && v >= max) return
      rows.push({ section, item, score: v === null ? -1 : v, max })
    })
  })
  rows.sort((a, b) => a.score - b.score)
  return rows.slice(0, limit).map((row, i) => ({
    ...row,
    aktivitas: AKTIVITAS_PKB[i % AKTIVITAS_PKB.length],
  }))
}

/* ------------------------------------------------------------------ */
/* Kehadiran dan tugas tambahan                                        */
/* ------------------------------------------------------------------ */

export function kehadiranStats(kehadiran = []) {
  const rows = BULAN.map((_b, i) => {
    const m = kehadiran[i] || {}
    const terlambat = toNumber(m.terlambat)
    const pulang = toNumber(m.pulang)
    const alpa = toNumber(m.alpa)
    const menit = terlambat + pulang
    const konversi = menit / MENIT_PER_HARI
    const tidakHadir = konversi + alpa
    return { terlambat, pulang, alpa, menit, konversi, tidakHadir }
  })
  const totalMenit = rows.reduce((a, r) => a + r.menit, 0)
  const totalKonversi = rows.reduce((a, r) => a + r.konversi, 0)
  const totalAlpa = rows.reduce((a, r) => a + r.alpa, 0)
  const totalTidakHadir = totalKonversi + totalAlpa
  const rasio = totalTidakHadir / HARI_EFEKTIF
  return { rows, totalMenit, totalKonversi, totalAlpa, totalTidakHadir, kehadiran: 1 - rasio }
}

export function jamTugasTambahan(identitas = {}) {
  const { tugas1, tugas2, tugas3 } = identitas
  return [tugas1, tugas2, tugas3].reduce((sum, t) => sum + (JAM_TUGAS[t] || 0), 0)
}

/* ------------------------------------------------------------------ */
/* Format angka                                                        */
/* ------------------------------------------------------------------ */

/* Menerima isian teks bebas: "1,5" dan "1.5" sama-sama dibaca 1,5. */
export const toNumber = (value, fallback = 0) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  const n = Number(String(value ?? '').trim().replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

export const angka = (n, d = 2) => Number(n).toLocaleString('id-ID', {
  minimumFractionDigits: d,
  maximumFractionDigits: d,
})

export const persen = (n) => `${angka(n, n % 1 === 0 ? 0 : 2)}%`

/* ------------------------------------------------------------------ */
/* Rekap 14 kompetensi, masa kerja, dan angka kredit                   */
/* ------------------------------------------------------------------ */

export function rekapKompetensi(inst, jawaban) {
  const rows = inst.sections.map((section, idx) => {
    const st = sectionStats(inst, idx, jawaban)
    return {
      number: section.number,
      title: section.title,
      ...st,
      grade: st.answered ? gradeOf(st.pct) : null,
    }
  })
  const total = rows.reduce((sum, r) => sum + (r.grade || 0), 0)
  const max = rows.length * 4
  const answered = rows.filter((r) => r.answered > 0).length
  const pct = answered && max ? (total / max) * 100 : 0
  /* Konversi nilai PKG selalu bilangan bulat tanpa desimal. */
  return { rows, total, max, answered, pct: Math.round(pct) }
}

const MONTHS = {
  januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
  juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
}

export function parseTanggal(value) {
  if (!value) return null
  const m = String(value).trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/)
  if (!m) return null
  const month = MONTHS[m[2].toLowerCase()]
  if (month === undefined) return null
  const date = new Date(Number(m[3]), month, Number(m[1]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function masaKerja(tmtGuru, acuan) {
  const start = parseTanggal(tmtGuru)
  const end = parseTanggal(acuan) || new Date()
  if (!start) return '—'
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) months -= 1
  if (months < 0) return '—'
  const years = Math.floor(months / 12)
  const rest = months % 12
  const parts = []
  if (years) parts.push(`${years} Tahun`)
  if (rest) parts.push(`${rest} Bulan`)
  return parts.length ? parts.join(' ') : '0 Bulan'
}

const GOLONGAN_NEXT = {
  'III/a': 'III/b',
  'III/b': 'III/c',
  'III/c': 'III/d',
  'III/d': 'IV/a',
  'IV/a': 'IV/b',
  'IV/b': 'IV/c',
  'IV/c': 'IV/d',
  'IV/d': 'IV/e',
}

export function golonganSingkat(pangkat) {
  const match = String(pangkat || '').match(/(I{1,3}|IV)\/[a-e]/)
  return match ? match[0] : '—'
}

export function angkaKredit(pangkat, nilaiAkhir) {
  const g = golonganOf(pangkat)
  const akpkb = g.diri + g.publikasi
  const nilai = Number(nilaiAkhir) || 0
  const npk = nilai <= 50 ? 25 : nilai <= 60 ? 50 : nilai <= 75 ? 75 : nilai <= 90 ? 100 : nilai <= 100 ? 125 : 0
  const perolehan = npk ? ((g.ak - akpkb - g.penunjang) * (npk / 100)) / 4 : 0
  const gol = golonganSingkat(pangkat)
  return {
    akk: g.ak,
    akpkb,
    akp: g.penunjang,
    npk,
    golongan: gol,
    next: GOLONGAN_NEXT[gol] || '—',
    sebutan: predikatOf(nilai),
    perolehan: Math.max(0, perolehan),
  }
}
