import {
  BULAN, GOLONGAN, HARI_EFEKTIF, JAM_TUGAS, angka, gradeOf, persen, predikatOf,
  answerOf as calcAnswerOf,
  finalScore as calcFinalScore,
  instrumentStats as calcInstrumentStats,
  jamTugasTambahan as calcJamTugasTambahan,
  kehadiranStats as calcKehadiranStats,
  overallProgress as calcOverallProgress,
  prioritasRows as calcPrioritasRows,
  rekapRows as calcRekapRows,
  sectionStats as calcSectionStats,
} from './calc.js'
import { buildReport, printHtml } from './report.js'

const DATA_URL = './data/instruments.json'
const STORAGE_KEY = 'pkg-web-v1'

/* ------------------------------------------------------------------ */
/* Referensi dari sheet REF, DATA, dan KH pada PKG.xlsm                */
/* ------------------------------------------------------------------ */

const IDENTITAS_FIELDS = [
  { key: 'nama', label: 'Nama Guru' },
  { key: 'nip', label: 'NIP' },
  { key: 'nrg', label: 'NRG' },
  { key: 'nuptk', label: 'NUPTK' },
  { key: 'karpeg', label: 'Nomor Seri Karpeg' },
  { key: 'jenisKelamin', label: 'Jenis Kelamin', type: 'select', options: ['Laki-laki', 'Perempuan'] },
  { key: 'tempatLahir', label: 'Tempat Lahir' },
  { key: 'tanggalLahir', label: 'Tanggal Lahir' },
  { key: 'pendidikan', label: 'Pendidikan Terakhir' },
  { key: 'pangkat', label: 'Pangkat / Golongan', type: 'select', options: Object.keys(GOLONGAN) },
  { key: 'tmtGol', label: 'TMT Golongan' },
  { key: 'tmtGuru', label: 'TMT sebagai Guru' },
  { key: 'tmtTugas', label: 'TMT Tugas Tambahan' },
  { key: 'mapel', label: 'Mata Pelajaran / Kelas' },
  { key: 'jamMengajar', label: 'Jumlah Jam Mengajar', type: 'number' },
  { key: 'tugas1', label: 'Tugas Tambahan 1', type: 'select', options: Object.keys(JAM_TUGAS) },
  { key: 'tugas2', label: 'Tugas Tambahan 2', type: 'select', options: Object.keys(JAM_TUGAS) },
  { key: 'tugas3', label: 'Tugas Tambahan 3', type: 'select', options: Object.keys(JAM_TUGAS) },
  { key: 'tugasLain', label: 'Tugas di Lembaga Lain' },
  { key: 'jamLain', label: 'Jumlah Jam di Lembaga Lain', type: 'number' },
  { key: 'penilai', label: 'Nama Penilai' },
  { key: 'nipPenilai', label: 'NIP Penilai' },
  { key: 'pangkatPenilai', label: 'Pangkat/Golongan Penilai' },
  { key: 'tanggalPenilaian', label: 'Tanggal Penilaian' },
  { key: 'periodeAwal', label: 'Periode Penilaian (awal)' },
  { key: 'periodeAkhir', label: 'Periode Penilaian (akhir)' },
  { key: 'formatif', label: 'Formatif', type: 'select', options: ['0', '1', 'V'] },
  { key: 'sumatif', label: 'Sumatif', type: 'select', options: ['0', '1', 'V'] },
  { key: 'kemajuan', label: 'Kemajuan', type: 'select', options: ['0', '1', 'V'] },
  { key: 'madrasah', label: 'Nama Madrasah' },
  { key: 'alamat', label: 'Alamat Madrasah' },
  { key: 'telp', label: 'Telp / Fax Madrasah' },
  { key: 'kelurahan', label: 'Kelurahan / Desa' },
  { key: 'kecamatan', label: 'Kecamatan' },
  { key: 'kabupaten', label: 'Kabupaten / Kota' },
  { key: 'provinsi', label: 'Provinsi' },
  { key: 'tahun', label: 'Tahun' },
  { key: 'kepala', label: 'Nama Kepala Madrasah' },
  { key: 'nipKepala', label: 'NIP Kepala Madrasah' },
]

const DEFAULT_IDENTITAS = {
  nama: 'Mohammad Yusuf Rizaldy, S.Pd',
  nip: '-',
  nrg: '-',
  nuptk: '-',
  karpeg: '-',
  jenisKelamin: 'Laki-laki',
  tempatLahir: 'Jombang',
  tanggalLahir: '24 Desember 1997',
  pendidikan: 'S1',
  pangkat: 'Penata Muda, III/a',
  tmtGol: '1 Juli 2025',
  tmtGuru: '1 Juli 2025',
  tmtTugas: '',
  mapel: 'Bahasa Inggris',
  jamMengajar: 20,
  tugas1: 'Pembina Ekstrakurikuler',
  tugas2: 'Guru Piket',
  tugas3: '-',
  tugasLain: '',
  jamLain: 0,
  penilai: 'H. Wachid, S.Ag',
  nipPenilai: '',
  pangkatPenilai: '',
  tanggalPenilaian: '14 September 2026',
  periodeAwal: '1 Juli 2026',
  periodeAkhir: '31 Desember 2026',
  formatif: '0',
  sumatif: 'V',
  kemajuan: '0',
  madrasah: 'MI Plus Darul Falah',
  alamat: 'Jl. Yos Sudarso 06 Gambiran Mojoagung Jombang',
  telp: '085784600068',
  kelurahan: 'Gambiran',
  kecamatan: 'Mojoagung',
  kabupaten: 'Jombang',
  provinsi: 'Jawa Timur',
  tahun: '2025',
  kepala: 'H. Wachid, S.Ag',
  nipKepala: '',
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const emptyMonths = () => BULAN.map(() => ({ terlambat: '', pulang: '', alpa: '' }))

function defaultState() {
  return {
    identitas: { ...DEFAULT_IDENTITAS },
    instrumenAktif: 'gmp',
    jawaban: {},
    kehadiran: emptyMonths(),
    diperbarui: new Date().toISOString(),
  }
}

let state = load()
let instruments = []

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    return {
      ...defaultState(),
      ...parsed,
      identitas: { ...DEFAULT_IDENTITAS, ...(parsed.identitas || {}) },
      jawaban: parsed.jawaban || {},
      kehadiran: Array.isArray(parsed.kehadiran) && parsed.kehadiran.length === 12
        ? parsed.kehadiran
        : emptyMonths(),
    }
  } catch {
    return defaultState()
  }
}

function save() {
  state.diperbarui = new Date().toISOString()
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    toast('Penyimpanan lokal penuh; gunakan Ekspor.')
  }
}

/* ------------------------------------------------------------------ */
/* Perhitungan (mengikuti rumus sheet PKKM_*, N-GR, dan REKAP)         */
/* ------------------------------------------------------------------ */

const answerOf = (instId, sIdx, iIdx) => calcAnswerOf(state.jawaban, instId, sIdx, iIdx)
const sectionStats = (inst, sIdx) => calcSectionStats(inst, sIdx, state.jawaban)
const instrumentStats = (inst) => calcInstrumentStats(inst, state.jawaban)
const rekapRows = () => calcRekapRows(instruments, state.jawaban)
const finalScore = () => calcFinalScore(instruments, state.jawaban)
const overallProgress = () => calcOverallProgress(instruments, state.jawaban)
const prioritasRows = (instId, limit = 12) =>
  calcPrioritasRows(instruments.find((i) => i.id === instId), state.jawaban, limit)
const kehadiranStats = () => calcKehadiranStats(state.kehadiran)
const jamTugasTambahan = () => calcJamTugasTambahan(state.identitas)

/* ------------------------------------------------------------------ */
/* Render helpers                                                      */
/* ------------------------------------------------------------------ */

const $ = (sel) => document.querySelector(sel)
const el = (tag, props = {}, ...kids) => {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v
    else if (k === 'text') node.textContent = v
    else if (k === 'html') node.innerHTML = v
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v)
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v)
  }
  kids.flat().forEach((kid) => kid && node.append(kid))
  return node
}

let toastTimer
function toast(message) {
  const node = $('#toast')
  node.textContent = message
  node.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { node.hidden = true }, 2400)
}

/* ------------------------------------------------------------------ */
/* Tab: Identitas                                                      */
/* ------------------------------------------------------------------ */

function renderIdentitas() {
  const view = $('#view-identitas')
  view.replaceChildren()

  const gol = GOLONGAN[state.identitas.pangkat] || { ak: 0, diri: 0, publikasi: 0, penunjang: 0 }

  const grid = el('div', { class: 'grid' })
  IDENTITAS_FIELDS.forEach((f) => {
    const input = f.type === 'select'
      ? el('select', {}, ...f.options.map((o) => el('option', {
        value: o,
        selected: String(state.identitas[f.key]) === o ? 'selected' : null,
        text: o,
      })))
      : el('input', {
        type: f.type === 'number' ? 'number' : 'text',
        value: state.identitas[f.key] ?? '',
      })
    if (f.type === 'select') input.value = state.identitas[f.key]
    input.addEventListener('input', () => {
      state.identitas[f.key] = f.type === 'number' ? Number(input.value) : input.value
      save()
      renderIdentitas()
      updateChrome()
    })
    grid.append(el('div', { class: 'field' }, el('label', { text: f.label }), input))
  })

  const stats = el('div', { class: 'stat-grid' },
    stat('Jam tugas tambahan', `${jamTugasTambahan()} jam`,
      'Kepala 24, waka/kepala lab 12, wali kelas & pembina ekskul 6, guru piket 1'),
    stat('AK komulatif minimal', `${gol.ak}`, `Untuk golongan ${state.identitas.pangkat}`),
    stat('AK pengembangan diri', `${gol.diri}`, 'Target angka kredit unsur pengembangan diri'),
    stat('AK publikasi / karya inovatif', `${gol.publikasi}`, `${gol.penunjang} untuk unsur penunjang`),
  )

  view.append(
    el('div', { class: 'card' },
      el('h2', { text: 'Identitas guru, penilai, dan madrasah' }),
      el('p', { class: 'muted', text: 'Nilai di sini dipakai pada semua instrumen, rekap, dan halaman cetak.' }),
      grid),
    el('div', { class: 'card' },
      el('h2', { text: 'Turunan otomatis' }),
      el('p', { class: 'muted', text: 'Dihitung dengan aturan yang sama seperti sheet DATA pada berkas asli.' }),
      stats),
  )
}

function stat(label, value, hint) {
  return el('div', { class: 'stat' },
    el('span', { text: label }),
    el('strong', { text: value }),
    hint ? el('div', { class: 'muted small', text: hint }) : null)
}

/* ------------------------------------------------------------------ */
/* Tab: Instrumen                                                      */
/* ------------------------------------------------------------------ */

function renderInstrumen() {
  const view = $('#view-instrumen')
  view.replaceChildren()
  const inst = instruments.find((i) => i.id === state.instrumenAktif) || instruments[0]
  const st = instrumentStats(inst)

  const picker = el('div', { class: 'inst-picker' },
    ...instruments.map((i) => el('button', {
      class: `chip${i.id === inst.id ? ' active' : ''}`,
      text: i.label,
      onclick: () => {
        state.instrumenAktif = i.id
        save()
        renderInstrumen()
      },
    })))

  const summary = el('div', { class: 'inst-summary' },
    el('div', {}, el('span', { text: 'Instrumen' }), el('strong', { text: inst.sheet })),
    el('div', {}, el('span', { text: 'Indikator' }), el('strong', { text: `${st.answered} / ${st.items}` })),
    el('div', {}, el('span', { text: 'Total skor' }), el('strong', { text: `${st.total} / ${st.max}` })),
    el('div', {}, el('span', { text: 'Nilai' }), el('strong', { text: persen(st.pct) })),
    el('div', {}, el('span', { text: 'Grade (N-GR)' }), el('strong', { text: st.answered ? st.grade : '—' })),
  )

  const table = el('table', { class: 'score-table' })
  const opts = inst.options
  table.append(el('thead', {}, el('tr', {},
    el('th', { class: 'num', text: 'No' }),
    el('th', { text: 'Indikator kinerja' }),
    ...opts.map((o) => el('th', { class: 'opt', text: String(o) })),
    el('th', { class: 'opt', text: 'Skor' }),
  )))

  const tbody = el('tbody')
  inst.sections.forEach((section, sIdx) => {
    const head = sectionStats(inst, sIdx)
    tbody.append(el('tr', { class: 'section' }, el('td', { colspan: opts.length + 3 },
      el('span', { text: `Kompetensi ${section.number}. ${section.title}` }),
      el('small', { text: `  — ${head.items} indikator, skor maksimum ${head.max}` }))))

    section.items.forEach((item, iIdx) => {
      const current = answerOf(inst.id, sIdx, iIdx)
      const cells = item.options.map((opt) => {
        const btn = el('button', {
          class: `opt-btn${current === opt.score ? ' on' : ''}`,
          title: `Skor ${opt.score}`,
          'aria-pressed': current === opt.score ? 'true' : 'false',
          onclick: () => {
            const key = `${sIdx}:${iIdx}`
            state.jawaban[inst.id] = state.jawaban[inst.id] || {}
            if (current === opt.score) delete state.jawaban[inst.id][key]
            else state.jawaban[inst.id][key] = opt.score
            save()
            renderInstrumen()
            updateChrome()
          },
        }, el('span', { class: 'v', text: String(opt.score) }))
        return el('td', { class: 'opt' }, btn)
      })
      tbody.append(el('tr', {},
        el('td', { class: 'num', text: item.no }),
        el('td', { text: item.text }),
        ...cells,
        el('td', { class: 'row-score', text: current === null ? '—' : String(current) }),
      ))
    })

    tbody.append(el('tr', { class: 'section-foot' }, el('td', { colspan: opts.length + 3 },
      el('b', { text: `Total skor kompetensi ${section.number}: ${head.total} / ${head.max}` }),
      el('span', { text: `   ·   Nilai = (total skor ÷ ${head.max}) × 100% = ` }),
      el('b', { text: persen(head.pct) }),
      el('span', { text: `   ·   ${head.answered} dari ${head.items} indikator terisi` }),
    )))
  })

  table.append(tbody)

  view.append(
    el('div', { class: 'card' },
      el('h2', { text: 'Pilih instrumen' }),
      el('p', { class: 'muted', text: 'Sembilan instrumen dari berkas asli. Klik sel skor untuk menandai X; klik lagi untuk mengosongkan.' }),
      picker),
    summary,
    el('div', { class: 'card' }, table),
    el('div', { class: 'note', text: 'Aturan penilaian mengikuti berkas asli: setiap indikator diberi satu tanda X pada kolom skor, dan nilai kompetensi = (total skor ÷ (jumlah indikator × 2)) × 100%.' }),
  )
}

/* ------------------------------------------------------------------ */
/* Tab: Rekap                                                          */
/* ------------------------------------------------------------------ */

function renderRekap() {
  const view = $('#view-rekap')
  view.replaceChildren()
  const rows = rekapRows()
  const final = finalScore()

  const table = el('table', { class: 'data-table' })
  table.append(el('thead', {}, el('tr', {},
    el('th', { text: 'Instrumen' }),
    el('th', { class: 'num', text: 'Terisi' }),
    el('th', { class: 'num', text: 'Total skor' }),
    el('th', { class: 'num', text: 'Maks' }),
    el('th', { class: 'num', text: 'Nilai' }),
    el('th', { class: 'num', text: 'Grade' }),
    el('th', { text: 'Keterangan' }),
  )))

  const tbody = el('tbody')
  rows.forEach((r) => {
    tbody.append(el('tr', {},
      el('td', {}, el('button', {
        class: 'btn small',
        text: r.inst.label,
        onclick: () => {
          state.instrumenAktif = r.inst.id
          save()
          switchTab('instrumen')
        },
      })),
      el('td', { class: 'num', text: `${r.answered}/${r.items}` }),
      el('td', { class: 'num', text: String(r.total) }),
      el('td', { class: 'num', text: String(r.max) }),
      el('td', { class: 'num', text: r.answered ? persen(r.pct) : '—' }),
      el('td', { class: 'num' }, gradeBadge(r.grade)),
      el('td', { class: 'muted', text: r.answered ? predikatOf(r.pct) : 'Belum dinilai' }),
    ))
  })
  table.append(tbody)

  view.append(
    el('div', { class: 'stat-grid' },
      stat('Nilai akhir', final ? persen(final.pct) : '—', final ? `Rata-rata ${final.count} instrumen terisi` : 'Belum ada instrumen terisi'),
      stat('Predikat', final ? final.predikat : '—', 'Amat Baik ≥91 · Baik 76–90 · Cukup 61–75 · Sedang 51–60'),
      stat('Instrumen selesai', `${rows.filter((r) => r.answered === r.items).length} / ${rows.length}`, 'Semua indikator terisi'),
    ),
    el('div', { class: 'card' },
      el('h2', { text: 'Rekap hasil penilaian kinerja' }),
      el('p', { class: 'muted', text: 'Setara sheet N-GR dan REKAP NGR: nilai tiap instrumen dikonversi ke grade 1–4 dengan ambang 26/51/76.' }),
      table),
  )
}

function gradeBadge(grade) {
  if (grade === null) return el('span', { class: 'badge none', text: '—' })
  return el('span', { class: `badge g${grade}`, text: String(grade) })
}

/* ------------------------------------------------------------------ */
/* Tab: Prioritas PKB                                                  */
/* ------------------------------------------------------------------ */

function renderPrioritas() {
  const view = $('#view-prioritas')
  view.replaceChildren()
  const instId = state.instrumenAktif
  const inst = instruments.find((i) => i.id === instId)
  const rows = prioritasRows(instId)

  const picker = el('div', { class: 'inst-picker' },
    ...instruments.map((i) => el('button', {
      class: `chip${i.id === inst.id ? ' active' : ''}`,
      text: i.label,
      onclick: () => {
        state.instrumenAktif = i.id
        save()
        renderPrioritas()
      },
    })))

  const table = el('table', { class: 'data-table' })
  table.append(el('thead', {}, el('tr', {},
    el('th', { class: 'num', text: 'No' }),
    el('th', { text: 'Kompetensi / Indikator' }),
    el('th', { text: 'Unsur PKB' }),
    el('th', { text: 'Jenis kegiatan' }),
  )))

  const tbody = el('tbody')
  if (!rows.length) {
    tbody.append(el('tr', {}, el('td', { colspan: 4, class: 'muted', text: 'Semua indikator sudah terpenuhi penuh pada instrumen ini.' })))
  }
  rows.forEach((r, i) => {
    tbody.append(el('tr', {},
      el('td', { class: 'num', text: String(i + 1) }),
      el('td', {},
        el('div', { class: 'muted small', text: `Kompetensi ${r.section.number}. ${r.section.title} · skor ${r.score < 0 ? 'belum diisi' : r.score} dari ${r.max}` }),
        el('div', { text: r.item.text })),
      el('td', { text: r.aktivitas.unsur }),
      el('td', {}, el('b', { text: `${r.aktivitas.kode} ` }), document.createTextNode(r.aktivitas.nama)),
    ))
  })
  table.append(tbody)

  view.append(
    el('div', { class: 'card' },
      el('h2', { text: 'Instrumen sumber' }),
      el('p', { class: 'muted', text: 'Indikator dengan skor terendah menjadi prioritas pengembangan keprofesian berkelanjutan.' }),
      picker),
    el('div', { class: 'card' },
      el('h2', { text: 'Prioritas PKB' }),
      el('p', { class: 'muted', text: '12 indikator terendah, dipetakan ke kegiatan PKB dari sheet REF (1.1–3.4).' }),
      table),
  )
}

/* ------------------------------------------------------------------ */
/* Tab: Kehadiran                                                      */
/* ------------------------------------------------------------------ */

function renderKehadiran() {
  const view = $('#view-kehadiran')
  view.replaceChildren()
  const kh = kehadiranStats()

  const table = el('table', { class: 'data-table' })
  table.append(el('thead', {}, el('tr', {},
    el('th', { text: 'Bulan' }),
    el('th', { class: 'num', text: 'Terlambat (menit)' }),
    el('th', { class: 'num', text: 'Pulang cepat (menit)' }),
    el('th', { class: 'num', text: 'Jumlah menit' }),
    el('th', { class: 'num', text: 'Konversi (hari)' }),
    el('th', { class: 'num', text: 'Tanpa keterangan (hari)' }),
    el('th', { class: 'num', text: 'Tidak hadir (hari)' }),
  )))

  const tbody = el('tbody')
  const inputs = (index, key) => {
    const input = el('input', {
      type: 'number',
      min: '0',
      value: state.kehadiran[index][key],
      style: 'max-width:110px;text-align:right',
    })
    input.addEventListener('input', () => {
      state.kehadiran[index][key] = input.value
      save()
      renderKehadiran()
    })
    return input
  }

  BULAN.forEach((bulan, i) => {
    const row = kh.rows[i]
    tbody.append(el('tr', {},
      el('td', { text: bulan }),
      el('td', { class: 'num' }, inputs(i, 'terlambat')),
      el('td', { class: 'num' }, inputs(i, 'pulang')),
      el('td', { class: 'num', text: String(row.menit) }),
      el('td', { class: 'num', text: angka(row.konversi, 3) }),
      el('td', { class: 'num' }, inputs(i, 'alpa')),
      el('td', { class: 'num', text: angka(row.tidakHadir, 3) }),
    ))
  })
  table.append(tbody)
  table.append(el('tfoot', {}, el('tr', {},
    el('td', { text: 'Jumlah' }),
    el('td', { class: 'num', text: String(kh.rows.reduce((a, r) => a + r.terlambat, 0)) }),
    el('td', { class: 'num', text: String(kh.rows.reduce((a, r) => a + r.pulang, 0)) }),
    el('td', { class: 'num', text: String(kh.totalMenit) }),
    el('td', { class: 'num', text: angka(kh.totalKonversi, 3) }),
    el('td', { class: 'num', text: String(kh.totalAlpa) }),
    el('td', { class: 'num', text: angka(kh.totalTidakHadir, 3) }),
  )))

  view.append(
    el('div', { class: 'stat-grid' },
      stat('Hari efektif', `${HARI_EFEKTIF} hari`, 'Pembagi tetap seperti sheet KH'),
      stat('Total tidak hadir', `${angka(kh.totalTidakHadir, 3)} hari`, `${angka(kh.totalMenit)} menit terlambat/pulang cepat + ${kh.totalAlpa} hari alpa`),
      stat('Persentase kehadiran', persen(kh.kehadiran * 100), '1 − (tidak hadir ÷ hari efektif)'),
    ),
    el('div', { class: 'card' },
      el('h2', { text: 'Rekapitulasi ketidakhadiran guru' }),
      el('p', { class: 'muted', text: 'Terlambat dan pulang cepat diisi menit; 450 menit dikonversi menjadi 1 hari.' }),
      table),
  )
}

/* ------------------------------------------------------------------ */
/* Tab: Cetak                                                          */
/* ------------------------------------------------------------------ */

let reportAssets = { css: '', logo: '' }
let pdfApiAvailable = false

const blobToDataUrl = (blob) => new Promise((resolve) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => resolve('')
  reader.readAsDataURL(blob)
})

async function detectPdfApi() {
  try {
    const res = await fetch('/api/pdf', { method: 'HEAD' })
    const type = res.headers.get('content-type') || ''
    pdfApiAvailable = res.status === 405 || (res.ok && !type.includes('text/html'))
  } catch {
    pdfApiAvailable = false
  }
}

function currentReport() {
  return buildReport(state, instruments, {
    logo: reportAssets.logo,
    jamTugas: jamTugasTambahan(),
    prioritas: prioritasRows(state.instrumenAktif, 5),
  })
}

function printSheets(html) {
  const frame = el('iframe', {
    'aria-hidden': 'true',
    style: 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden',
  })
  frame.onload = () => {
    try {
      frame.contentWindow.focus()
      frame.contentWindow.print()
    } finally {
      setTimeout(() => frame.remove(), 60000)
    }
  }
  frame.srcdoc = printHtml(html || '', reportAssets.css)
  document.body.append(frame)
}

async function savePdf(html, filename, trigger) {
  if (!pdfApiAvailable) {
    printSheets(html)
    toast('Dialog cetak dibuka. Pilih "Simpan sebagai PDF".')
    return
  }
  const label = trigger ? trigger.textContent : ''
  if (trigger) {
    trigger.disabled = true
    trigger.textContent = 'Menyiapkan…'
  }
  try {
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: printHtml(html, reportAssets.css), filename }),
    })
    if (!res.ok) {
      let message = 'PDF gagal dibuat'
      try {
        const data = await res.json()
        if (data?.message) message = data.message
      } catch { /* respons bukan JSON */ }
      throw new Error(message)
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = el('a', { href: url, download: filename })
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    toast('PDF berhasil dibuat.')
  } catch (err) {
    toast(`${err.message}. Membuka dialog cetak…`)
    printSheets(html)
  } finally {
    if (trigger) {
      trigger.disabled = false
      trigger.textContent = label
    }
  }
}

function renderCetak() {
  const view = $('#view-cetak')
  view.replaceChildren()
  const report = currentReport()

  const intro = 'Enam dokumen sesuai format PKG: sampul, identitas diri, prioritas PKB, rekap nilai, perolehan angka kredit, dan laporan evaluasi. Ukuran halaman 21 × 33 cm (F4).'
    + (pdfApiAvailable ? '' : ' Pada versi statis ini, tombol cetak membuka dialog “Simpan sebagai PDF”.')
  const toolbar = el('div', { class: 'print-toolbar' },
    el('div', { class: 'print-intro' },
      el('h2', { text: 'Dokumen laporan' }),
      el('p', { class: 'muted', text: intro })),
    el('div', { class: 'print-actions' },
      el('button', {
        class: 'btn primary',
        text: pdfApiAvailable ? 'Unduh PDF (semua)' : 'Cetak / Simpan PDF',
        onclick: (event) => savePdf(report.allHtml, report.combinedFilename, event.currentTarget),
      }),
      el('button', { class: 'btn', text: 'Cetak', onclick: () => printSheets(report.allHtml) }),
    ),
  )

  const preview = el('div', { class: 'doc-preview' })
  report.groups.forEach((group) => {
    const stack = el('div', { class: 'sheet-stack' })
    stack.innerHTML = group.html
    const card = el('div', { class: 'doc-card' },
      el('div', { class: 'doc-card-head' },
        el('div', { class: 'doc-card-title' },
          el('strong', { text: group.label }),
          el('span', { class: 'muted small', text: `${group.pages.length} halaman` })),
        el('button', {
          class: 'btn small',
          text: pdfApiAvailable ? 'Unduh PDF' : 'Cetak',
          onclick: (event) => savePdf(group.html, group.filename, event.currentTarget),
        }),
      ),
      stack,
    )
    preview.append(card)
  })

  view.append(toolbar, preview)
}

async function loadReportAssets() {
  try {
    const res = await fetch('./report.css')
    if (!res.ok) return
    let css = await res.text()
    const fonts = [
      'carlito-400-normal.woff2',
      'carlito-700-normal.woff2',
      'carlito-400-italic.woff2',
    ]
    await Promise.all(fonts.map(async (file) => {
      try {
        const font = await fetch(`./assets/fonts/${file}`)
        if (!font.ok) return
        const dataUrl = await blobToDataUrl(await font.blob())
        if (dataUrl) css = css.replaceAll(`./assets/fonts/${file}`, dataUrl.replace(/^data:[^;]*;/, 'data:font/woff2;'))
      } catch { /* font tetap memakai berkas asli */ }
    }))
    reportAssets.css = css
  } catch { /* memakai gaya bawaan */ }

  try {
    const res = await fetch('./assets/logo-kemenag.png')
    if (res.ok) reportAssets.logo = await blobToDataUrl(await res.blob())
  } catch { reportAssets.logo = '' }
}

/* ------------------------------------------------------------------ */
/* Chrome: judul, progres, nilai akhir                                 */
/* ------------------------------------------------------------------ */

const TITLES = {
  identitas: ['Identitas Guru', 'Data pokok yang dipakai seluruh instrumen dan laporan.'],
  instrumen: ['Instrumen Penilaian', 'Tandai satu sel skor per indikator; nilai dihitung otomatis.'],
  rekap: ['Rekap Nilai', 'Gabungan seluruh instrumen beserta konversi grade.'],
  prioritas: ['Prioritas PKB', 'Indikator terendah dipetakan ke kegiatan pengembangan keprofesian.'],
  kehadiran: ['Kehadiran', 'Rekapitulasi ketidakhadiran dan persentase kehadiran.'],
  cetak: ['Cetak Laporan', 'Pratinjau dan cetak dokumen PDF (21 × 33 cm).'],
}

let activeTab = 'identitas'

function switchTab(tab) {
  activeTab = tab
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab))
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== `view-${tab}` })
  const [title, sub] = TITLES[tab]
  $('#page-title').textContent = title
  $('#page-sub').textContent = sub
  renderActive()
  window.scrollTo({ top: 0, behavior: 'instant' })
}

function renderActive() {
  if (activeTab === 'identitas') renderIdentitas()
  if (activeTab === 'instrumen') renderInstrumen()
  if (activeTab === 'rekap') renderRekap()
  if (activeTab === 'prioritas') renderPrioritas()
  if (activeTab === 'kehadiran') renderKehadiran()
  if (activeTab === 'cetak') renderCetak()
}

function updateChrome() {
  const prog = overallProgress()
  $('#progress-value').textContent = persen(prog.pct)
  $('#progress-bar').style.width = `${Math.min(100, prog.pct)}%`
  $('#progress-detail').textContent = `${prog.done} dari ${prog.all} indikator`
  const final = finalScore()
  $('#pill-nilai').textContent = final ? `Nilai akhir: ${persen(final.pct)} · ${final.predikat}` : 'Nilai akhir: —'
}

/* ------------------------------------------------------------------ */
/* Aksi global                                                         */
/* ------------------------------------------------------------------ */

const RESET_MESSAGE = 'Apakah Anda ingin mengosongkan semua isian di semua instrumen penilaian? ' +
  '(Apabila ada masalah dengan aplikasi ini, silahkan hubungi nomor WA: 089508058634 a.n. Sarjono)'

function resetAll() {
  if (!window.confirm(RESET_MESSAGE)) return
  state.jawaban = {}
  state.kehadiran = emptyMonths()
  save()
  renderActive()
  updateChrome()
  toast('Semua isian instrumen dikosongkan.')
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = el('a', { href: url, download: `pkg-${state.identitas.nama.replace(/[^\w]+/g, '-') || 'guru'}.json` })
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  toast('Data diekspor sebagai JSON.')
}

function importData(file) {
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result))
      state = {
        ...defaultState(),
        ...parsed,
        identitas: { ...DEFAULT_IDENTITAS, ...(parsed.identitas || {}) },
        jawaban: parsed.jawaban || {},
        kehadiran: Array.isArray(parsed.kehadiran) && parsed.kehadiran.length === 12 ? parsed.kehadiran : emptyMonths(),
      }
      save()
      renderActive()
      updateChrome()
      toast('Data berhasil diimpor.')
    } catch {
      toast('Berkas tidak valid.')
    }
  }
  reader.readAsText(file)
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                           */
/* ------------------------------------------------------------------ */

async function boot() {
  try {
    const res = await fetch(DATA_URL)
    if (!res.ok) throw new Error(String(res.status))
    instruments = await res.json()
  } catch (err) {
    $('#view-identitas').replaceChildren(el('div', { class: 'card' },
      el('h2', { text: 'Data instrumen gagal dimuat' }),
      el('p', { class: 'muted', text: `Pastikan app/data/instruments.json ada dan server berjalan. (${err})` })))
    return
  }

  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })
  $('#btn-reset').addEventListener('click', resetAll)
  $('#btn-export').addEventListener('click', exportData)
  $('#btn-import').addEventListener('click', () => $('#file-import').click())
  $('#file-import').addEventListener('change', (e) => {
    const file = e.target.files?.[0]
    if (file) importData(file)
    e.target.value = ''
  })
  $('#btn-print').addEventListener('click', () => {
    switchTab('cetak')
    setTimeout(() => printSheets(currentReport().allHtml), 150)
  })

  await Promise.all([loadReportAssets(), detectPdfApi()])
  switchTab(activeTab)
  updateChrome()
}

boot()
