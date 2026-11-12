/* Dokumen PDF PKG.
 *
 * Fungsi-fungsi di file ini murni menghasilkan string HTML, sehingga bisa
 * dipakai untuk pratinjau di layar maupun dikirim ke server untuk dicetak
 * menjadi PDF. Tata letak mengikuti contoh pada folder pdf/:
 *   01 sampul, 02 identitas diri, 03 prioritas PKB, 04 rekap + angka kredit
 *   + laporan evaluasi.
 */

import {
  angka, kehadiranStats, masaKerja,
  rekapKompetensi, angkaKredit,
} from './calc.js'

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[ch]))

const text = (value, fallback = '—') => {
  const out = String(value ?? '').trim()
  return out ? esc(out) : fallback
}

const num = (value, digits = 2) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const d = Math.abs(n - Math.round(n)) < 1e-9 ? 0 : digits
  return angka(n, d)
}

const sheet = (id, body, extraClass = '') =>
  `<section class="sheet ${extraClass}" data-doc="${id}">${body}</section>`

/* ------------------------------------------------------------------ */
/* Meta per peran                                                      */
/* ------------------------------------------------------------------ */

const ROLE = {
  gmp: {
    prio: 'PRIORITAS PKB GURU MATA PELAJARAN',
    prioHead: 'Kompetensi<br><span>(Indikator Kompetensi)</span>',
    rekap: ['REKAP HASIL PENILAIAN KINERJA GURU KELAS/MATA PELAJARAN'],
    laporan: 'PENILAIAN KINERJA GURU KELAS / MATA PELAJARAN',
    groups: [[1, 7, 'PEDAGOGIK'], [8, 10, 'KEPRIBADIAN'], [11, 12, 'SOSIAL'], [13, 14, 'PROFESIONAL']],
  },
  bk: {
    prio: 'PRIORITAS PKB GURU BIMBINGAN KONSELING',
    prioHead: 'Indikator Kompetensi',
    rekap: ['REKAP HASIL PENILAIAN KINERJA GURU BIMBINGAN KONSELING (BK)'],
    laporan: 'PENILAIAN KINERJA GURU BIMBINGAN KONSELING',
    groups: [[1, 7, 'PEDAGOGIK'], [8, 10, 'KEPRIBADIAN'], [11, 12, 'SOSIAL'], [13, 17, 'PROFESIONAL']],
  },
  gtik: {
    prio: 'PRIORITAS PKB GURU TIK',
    prioHead: 'Indikator Kompetensi',
    rekap: ['REKAP HASIL PENILAIAN KINERJA GURU TIK'],
    laporan: 'PENILAIAN KINERJA GURU TIK',
    groups: [[1, 3, 'PEDAGOGIK'], [4, 5, 'KEPRIBADIAN'], [6, 7, 'SOSIAL'], [8, 12, 'PROFESIONAL']],
  },
  wkkur: {
    prio: 'PRIORITAS PKB WAKIL KEPALA MADRASAH BIDANG KURIKULUM',
    prioHead: 'Indikator Kompetensi',
    rekap: ['REKAPITULASI HASIL PENILAIAN KINERJA WAKIL KEPALA MADRASAH', 'BIDANG KURIKULUM/AKADEMIK'],
    laporan: 'PENILAIAN KINERJA WAKIL KEPALA MADRASAH BIDANG KURIKULUM',
  },
  wksis: {
    prio: 'PRIORITAS PKB WAKIL KEPALA MADRASAH BIDANG KESISWAAN',
    prioHead: 'Indikator Kompetensi',
    rekap: ['REKAPITULASI HASIL PENILAIAN KINERJA WAKIL KEPALA MADRASAH', 'BIDANG KESISWAAN'],
    laporan: 'PENILAIAN KINERJA WAKIL KEPALA MADRASAH BIDANG KESISWAAN',
  },
  wksar: {
    prio: 'PRIORITAS PKB WAKIL KEPALA MADRASAH BIDANG SARANA DAN PRASARANA',
    prioHead: 'Indikator Kompetensi',
    rekap: ['REKAPITULASI HASIL PENILAIAN KINERJA WAKIL KEPALA MADRASAH', 'BIDANG SARANA DAN PRASARANA'],
    laporan: 'PENILAIAN KINERJA WAKIL KEPALA MADRASAH BIDANG SARANA DAN PRASARANA',
  },
  wkhum: {
    prio: 'PRIORITAS PKB WAKIL KEPALA MADRASAH BIDANG HUBUNGAN MASYARAKAT',
    prioHead: 'Indikator Kompetensi',
    rekap: ['REKAPITULASI HASIL PENILAIAN KINERJA WAKIL KEPALA MADRASAH', 'BIDANG HUBUNGAN MASYARAKAT'],
    laporan: 'PENILAIAN KINERJA WAKIL KEPALA MADRASAH BIDANG HUBUNGAN MASYARAKAT',
  },
  lab: {
    prio: 'PRIORITAS PKB KEPALA LABORATORIUM',
    prioHead: 'Indikator Kompetensi',
    rekap: ['REKAPITULASI HASIL PENILAIAN KINERJA', 'KEPALA LABORATORIUM'],
    laporan: 'PENILAIAN KINERJA KEPALA LABORATORIUM',
  },
  pus: {
    prio: 'PRIORITAS PKB KEPALA PERPUSTAKAAN',
    prioHead: 'Indikator Kompetensi',
    rekap: ['REKAPITULASI HASIL PENILAIAN KINERJA', 'KEPALA PERPUSTAKAAN'],
    laporan: 'PENILAIAN KINERJA KEPALA PERPUSTAKAAN',
  },
}

function metaFor(inst) {
  if (ROLE[inst.id]) return { ...ROLE[inst.id] }
  const label = String(inst.label || 'GURU').toUpperCase()
  return {
    prio: `PRIORITAS PKB ${label}`,
    prioHead: 'Indikator Kompetensi',
    rekap: [`REKAP HASIL PENILAIAN KINERJA ${label}`],
    laporan: `PENILAIAN KINERJA ${label}`,
  }
}

/* ------------------------------------------------------------------ */
/* Potongan HTML bersama                                               */
/* ------------------------------------------------------------------ */

const tugasTambahan = (id) =>
  [id.tugas1, id.tugas2, id.tugas3].map((t) => String(t || '').trim()).filter(Boolean)

const tempatTanggal = (id) =>
  `${text(id.kabupaten, '—')}, ${text(id.tanggalPenilaian, '—')}`

const namaPangkat = (id) => text(id.pangkat)

const nipLabel = (nip) => `NIP. ${String(nip || '').trim() ? esc(nip) : '-'}`

const nipLine = (nip) => {
  const value = String(nip || '').trim()
  return value ? `NIP. ${esc(value)}` : 'NIP.'
}

function identityRows(rows, abbr) {
  return rows.map((row, index) => {
    const [label, value, multi] = row
    const first = index === 0 ? abbr : ''
    return `<tr>
      <td class="abbr">${first}</td>
      <th>${esc(label)}</th>
      <td>: ${multi ? value : text(value)}</td>
    </tr>`
  }).join('')
}

function signature3(id) {
  return `<div class="sign-grid sign-grid--3">
    <div class="s-date"></div>
    <div class="s-date"></div>
    <div class="s-date">${tempatTanggal(id)}</div>
    <div class="s-role">Guru yang Dinilai</div>
    <div class="s-role">Penilai</div>
    <div class="s-role">Kepala Madrasah,</div>
    <div class="s-name">${text(id.nama)}</div>
    <div class="s-name">${text(id.penilai)}</div>
    <div class="s-name">${text(id.kepala)}</div>
    <div class="s-nip">${nipLabel(id.nip)}</div>
    <div class="s-nip">${nipLine(id.nipPenilai)}</div>
    <div class="s-nip">${nipLine(id.nipKepala)}</div>
  </div>`
}

function signature2(id) {
  return `<div class="sign-grid sign-grid--2">
    <div class="s-date"></div>
    <div class="s-date">${tempatTanggal(id)}</div>
    <div class="s-role">Penilai,</div>
    <div class="s-role">Guru yang dinilai,</div>
    <div class="s-name">${text(id.penilai)}</div>
    <div class="s-name">${text(id.nama)}</div>
    <div class="s-nip">${nipLine(id.nipPenilai)}</div>
    <div class="s-nip">${nipLabel(id.nip)}</div>
  </div>`
}

/* ------------------------------------------------------------------ */
/* 01 — Sampul                                                         */
/* ------------------------------------------------------------------ */

function coverDoc(d) {
  const id = d.id
  const tugas = tugasTambahan(id)
  const tugasHtml = (tugas.length ? tugas : ['-'])
    .map((t, i) => `<div class="tugas-line"><span>${i + 1}.</span>${text(t)}</div>`)
    .join('')

  return sheet('sampul', `
    <div class="cover-frame">
      <div class="cover-inner">
        <div class="cover-head">
          <h1>Penilaian Kinerja Guru</h1>
          <div class="cover-sub">( PKG )</div>
        </div>
        ${d.logo ? `<img class="cover-logo" src="${d.logo}" alt="Logo Kementerian Agama">` : '<div class="cover-logo"></div>'}
        <table class="cover-id">
          <tr><th>NAMA</th><td class="colon">:</td><td class="strong">${text(id.nama)}</td></tr>
          <tr><th>MATA PELAJARAN</th><td class="colon">:</td><td>${text(id.mapel)}</td></tr>
          <tr><th>TUGAS TAMBAHAN</th><td class="colon">:</td><td class="tugas">${tugasHtml}</td></tr>
        </table>
        <div class="cover-school">
          <div class="school-name">${esc(String(id.madrasah || '').toUpperCase())}</div>
          <div class="school-region">KABUPATEN ${esc(String(id.kabupaten || '').toUpperCase())}</div>
          <div class="school-period">Periode Penilaian : ${text(id.periodeAwal)} s.d. ${text(id.periodeAkhir)}</div>
        </div>
        <div class="cover-foot">
          <div>Kantor Kementerian Agama</div>
          <div>Kabupaten ${text(id.kabupaten)}</div>
          <div class="cover-year">TAHUN ${text(id.tahun)}</div>
        </div>
      </div>
    </div>`, 'sheet--sampul')
}

/* ------------------------------------------------------------------ */
/* 02 — Identitas diri                                                 */
/* ------------------------------------------------------------------ */

function identitasDoc(d) {
  const id = d.id
  const jamTugas = d.jamTugas
  const totalJam = (Number(id.jamMengajar) || 0) + (Number(id.jamLain) || 0) + jamTugas
  const tugas = tugasTambahan(id)
  const tugasHtml = (tugas.length ? tugas : ['-']).map((t) => text(t)).join('<br>')

  const rows = [
    ['Nama Guru', id.nama],
    ['NIP/No.Seri Karpeg', `${text(id.nip, '-')} / ${text(id.karpeg, '-')}`],
    ['Tempat/Tanggal Lahir', `${text(id.tempatLahir)}${id.tanggalLahir ? `, ${esc(id.tanggalLahir)}` : ''}`],
    ['Pangkat/Jabatan/Golongan', namaPangkat(id)],
    ['TMT Golongan', id.tmtGol],
    ['TMT sebagai guru', id.tmtGuru],
    ['NUPTK/NRG', `${text(id.nuptk, '-')} / ${text(id.nrg, '-')}`],
    ['Masa Kerja', masaKerja(id.tmtGuru, id.tanggalPenilaian)],
    ['Jenis Kelamin', id.jenisKelamin],
    ['Pendidikan Terakhir/Spesialisasi', id.pendidikan],
    ['Mata Pelajaran yang diampu (Satmingkal)', id.mapel],
    ['Jumlah Jam Mengajar per Minggu', `${num(id.jamMengajar, 0)} Jam Tatap Muka`],
    ['Nama Lembaga Lain untuk jam tambahan', id.tugasLain],
    ['Jumlah Jam Tambahan di Lembaga lain', Number(id.jamLain) ? `${num(id.jamLain, 0)} Jam Tatap Muka` : '—'],
    ['Tugas Tambahan sebagai', tugasHtml, true],
    ['Jumlah Jam Total', `${num(totalJam, 0)} Jam Tatap Muka`],
    ['TMT Tugas Tambahan', id.tmtTugas],
  ]

  const instansiRows = [
    ['Nama Instansi/Madrasah', id.madrasah],
    ['Telp / Fax', id.telp],
    ['Desa', id.kelurahan],
    ['Kecamatan', id.kecamatan],
    ['Kabupaten', id.kabupaten],
    ['Provinsi', id.provinsi],
  ]

  const penilaiRows = [
    ['Nama Penilai', id.penilai],
    ['NIP Penilai', id.nipPenilai],
    ['Pangkat/Jabatan/Golongan', id.pangkatPenilai],
    ['Periode Penilaian', `${text(id.periodeAwal)} s.d. ${text(id.periodeAkhir)}`],
    ['Tanggal Penilaian Guru', id.tanggalPenilaian],
  ]

  return sheet('identitas', `
    <h2 class="doc-title doc-title--rule doc-title--identitas">Identitas Diri</h2>

    <div class="doc-frame">
      <div class="doc-frame-head">IDENTITAS GURU YANG DINILAI</div>
      <table class="kv">
        ${identityRows(rows, 'a.')}
        ${identityRows(instansiRows, 'b.')}
      </table>
    </div>

    <div class="doc-frame doc-frame--gap">
      <div class="doc-frame-head">IDENTITAS PENILAI</div>
      <table class="kv">${identityRows(penilaiRows, '')}</table>
    </div>

    <div class="identitas-sign">${signature2(id)}</div>`)
}

/* ------------------------------------------------------------------ */
/* 03 — Prioritas PKB (landscape)                                      */
/* ------------------------------------------------------------------ */

function prioritasDoc(d) {
  const id = d.id
  const meta = d.meta

  const miniRows = [
    ['Nama Guru', id.nama],
    ['N I P', id.nip],
    ['Pangkat/Golongan', id.pangkat],
    ['Pendidikan Terakhir', id.pendidikan],
    ['Unit Kerja', id.madrasah],
    ['Tanggal Penilaian', id.tanggalPenilaian],
  ]

  const miniTable = (rows) => `<table class="mini-id">
    ${rows.map(([label, value]) => `
      <tr><th>${esc(label)}</th><td>: ${text(value)}</td></tr>`).join('')}
  </table>`

  const body = d.prioritas.length
    ? d.prioritas.map((row, i) => {
      const a = row.aktivitas
      const kegiatan = `${a.kode} ${a.nama} tentang ${row.item.text.toLowerCase()}`
      return `<tr>
        <td class="c">${i + 1}</td>
        <td>${text(row.item.text)}</td>
        <td>${text(a.unsur)}</td>
        <td>${esc(a.kode)} ${text(a.nama)}</td>
        <td>${esc(kegiatan)}</td>
      </tr>`
    }).join('')
    : `<tr><td colspan="5" class="empty">Semua indikator sudah terpenuhi penuh pada instrumen ini.</td></tr>`

  return sheet('prioritas', `
    <h2 class="doc-title doc-title--prio">${esc(meta.prio)}</h2>
    <div class="mini-id-grid">
      ${miniTable(miniRows.slice(0, 3))}
      ${miniTable(miniRows.slice(3))}
    </div>
    <table class="grid-table prio">
      <colgroup>
        <col style="width:9mm"><col style="width:92.5mm"><col style="width:37mm"><col style="width:49.5mm"><col>
      </colgroup>
      <thead>
        <tr>
          <th>No</th>
          <th>${meta.prioHead}</th>
          <th>Unsur PKB</th>
          <th>Jenis PKB</th>
          <th>Kegiatan PKB</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
    <div class="keep">
      <div class="sign-grid sign-grid--2 sign-grid--prio">
        <div class="s-date"></div>
        <div class="s-date">${tempatTanggal(id)}</div>
        <div class="s-role">Kepala Madrasah,</div>
        <div class="s-role">Guru Yang Dinilai,</div>
        <div class="s-name">${text(id.kepala)}</div>
        <div class="s-name">${text(id.nama)}</div>
        <div class="s-nip">${nipLine(id.nipKepala)}</div>
        <div class="s-nip">${nipLabel(id.nip)}</div>
      </div>
    </div>`, 'sheet--landscape')
}

/* ------------------------------------------------------------------ */
/* 04a — Rekap hasil penilaian                                         */
/* ------------------------------------------------------------------ */

function rekapIdentity(id) {
  return `<table class="kv kv--rekap">
    ${identityRows([
    ['Nama', id.nama],
    ['NIP', id.nip],
    ['Tempat/Tanggal Lahir', `${text(id.tempatLahir)}${id.tanggalLahir ? `, ${esc(id.tanggalLahir)}` : ''}`],
    ['Pangkat/Jabatan/Golongan', namaPangkat(id)],
    ['TMT sebagai guru', id.tmtGuru],
    ['Masa Kerja', masaKerja(id.tmtGuru, id.tanggalPenilaian)],
    ['Jenis Kelamin', id.jenisKelamin],
    ['Pendidikan Terakhir/Spesialisasi', id.pendidikan],
    ['Program Keahlian yang diampu', id.mapel],
  ], 'a.')}
    ${identityRows([
    ['Nama Instansi/Sekolah', id.madrasah],
    ['Telp/Fax', id.telp],
    ['Kelurahan', id.kelurahan],
    ['Kecamatan', id.kecamatan],
    ['Kabupaten/Kota', id.kabupaten],
    ['Provinsi', id.provinsi],
  ], 'b.')}
  </table>`
}

function rekapDoc(d) {
  const id = d.id
  const rk = d.rekap
  const meta = d.meta
  const groups = meta.groups || []
  const used = new Set()
  let groupLetter = 0
  let body = ''

  groups.forEach(([start, end, label]) => {
    const rows = rk.rows.filter((r) => r.number >= start && r.number <= end && !used.has(r.number))
    if (!rows.length) return
    groupLetter += 1
    body += `<tr class="grp"><td colspan="3">${String.fromCharCode(64 + groupLetter)}.&nbsp;&nbsp;${esc(label)}</td></tr>`
    rows.forEach((row) => {
      used.add(row.number)
      body += `<tr>
        <td class="c">${row.number}</td>
        <td>${text(row.title)}</td>
        <td class="r">${row.grade ?? '—'}</td>
      </tr>`
    })
  })

  rk.rows.filter((r) => !used.has(r.number)).forEach((row) => {
    body += `<tr>
      <td class="c">${row.number}</td>
      <td>${text(row.title)}</td>
      <td class="c">${row.grade ?? '—'}</td>
    </tr>`
  })

  return sheet('rekap', `
    <h2 class="doc-title doc-title--rekap">${meta.rekap.map(esc).join('<br>')}</h2>
    ${rekapIdentity(id)}

    <table class="period">
      <tr>
        <td rowspan="3" class="period-main">
          <div class="period-label">Periode Penilaian</div>
          <div class="period-value">${text(id.periodeAwal)}&nbsp; s.d. &nbsp;${text(id.periodeAkhir)}</div>
        </td>
        <td class="ps-label">Formatif</td><td class="ps-val">${text(id.formatif, '0')}</td>
        <td rowspan="3" class="period-year"><span>Tahun</span><b>${text(id.tahun)}</b></td>
      </tr>
      <tr><td class="ps-label">Sumatif</td><td class="ps-val">${text(id.sumatif, '0')}</td></tr>
      <tr><td class="ps-label">Kemajuan</td><td class="ps-val">${text(id.kemajuan, '0')}</td></tr>
    </table>

    <table class="grid-table rekap">
      <colgroup><col style="width:9mm"><col><col style="width:17mm"></colgroup>
      <thead><tr><th>NO</th><th>KOMPETENSI</th><th>NILAI</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="strong">Jumlah (Hasil Penilaian Kinerja Guru)</td>
          <td class="r strong">${rk.answered ? rk.total : '—'}</td>
        </tr>
        <tr>
          <td colspan="2">
            <div class="strong">Konversi nilai PKG ke dalam skala 0 - 100</div>
            <div class="formula-note">Nilai PKG (100) = (Nilai PKG/nilai maksimum PKG x 100)</div>
          </td>
          <td class="r strong">${rk.answered ? num(rk.pct) : '—'}</td>
        </tr>
      </tfoot>
    </table>

    <div class="keep rekap-sign">${signature3(id)}</div>`)
}

/* ------------------------------------------------------------------ */
/* 04b — Perolehan angka kredit                                        */
/* ------------------------------------------------------------------ */

function akpkbDoc(d) {
  const id = d.id
  const ak = d.ak
  const nilai = num(d.rekap.pct)
  const akhir = num(d.nilaiAkhir)
  const kehadiranPct = num(d.kehadiranPct)

  return sheet('akpkb', `
    <h2 class="doc-title doc-title--akpkb">Perolehan Angka Kredit Penilaian Kinerja Guru</h2>
    ${rekapIdentity(id)}

    <table class="grid-table ak">
      <colgroup>
        <col style="width:9mm"><col><col style="width:25mm"><col style="width:18mm"><col style="width:32mm">
      </colgroup>
      <thead>
        <tr>
          <th>No</th><th>Penilaian</th><th>Hasil Penilaian<br>Skala 100</th><th>Proporsi</th><th>Nilai</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="c">1</td>
          <td>Atasan (Kepala Sekolah/Pengawas/Guru Senior)</td>
          <td class="c">${d.rekap.answered ? nilai : '—'}</td>
          <td class="c">100%</td>
          <td class="c">${d.rekap.answered ? num(d.nilaiAkhir) : '—'}</td>
        </tr>
        <tr><td class="c">2</td><td>Rerata kuesioner kinerja oleh Guru Teman Sejawat</td><td></td><td></td><td></td></tr>
        <tr><td class="c">3</td><td>Rerata kuesioner kinerja oleh Peserta Didik</td><td></td><td></td><td></td></tr>
        <tr><td class="c">4</td><td>Rerata kuesioner kinerja oleh Orangtua Peserta Didik</td><td></td><td></td><td></td></tr>
        <tr class="ak-total"><td colspan="4">Nilai PK Guru = <b>Jumlah Nilai</b></td><td class="c">${d.rekap.answered ? num(d.nilaiAkhir) : '—'}</td></tr>
        <tr class="ak-total"><td colspan="4">Tidak Hadir Tanpa Keterangan = <b>(a hari)</b></td><td class="c">${num(d.kehadiran.totalAlpa, 0)}</td></tr>
        <tr class="ak-total"><td colspan="4">Persentase Nilai PKG dari Kehadiran = <b>100% - (a/46) x 100%</b></td><td class="c">${kehadiranPct}%</td></tr>
        <tr class="ak-total"><td colspan="4">Nilai Akhir PKG = <b>Nilai PKG x Persentase Nilai PKG dari Kehadiran</b></td><td class="c strong">${akhir}</td></tr>
        <tr class="ak-total">
          <td colspan="3">Sebutan <span class="small">(Nilai Persentase Kinerja / NPK)</span></td>
          <td class="c strong">${d.rekap.answered ? esc(ak.sebutan) : '—'}</td>
          <td class="c strong">${ak.npk ? `${ak.npk}%` : '—'}</td>
        </tr>
      </tbody>
    </table>

    <div class="ak-box">
      <div class="ak-left">
        <table class="ak-min">
          <tr><th>AKK Minimal Golongan</th><th>AKPKB Minimal</th><th>AKP Minimal</th></tr>
          <tr><td>${ak.akk}</td><td>${ak.akpkb}</td><td>${ak.akp}</td></tr>
          <tr><td>${esc(ak.golongan)}</td><td>Ke</td><td>${esc(ak.next)}</td></tr>
        </table>
        <p class="ak-note">Perolehan angka kredit (untuk pembelajaran) yang dihitung berdasarkan rumus:</p>
        <div class="ak-formula">((AKK Minimal Golongan − AKPKB Minimal − AKP Minimal) × NPK) ÷ 4</div>
      </div>
      <div class="ak-value">${d.rekap.answered ? angka(ak.perolehan, 2) : '—'}</div>
    </div>

    <div class="keep ak-sign">${signature3(id)}</div>`)
}

/* ------------------------------------------------------------------ */
/* 04c — Laporan dan evaluasi                                          */
/* ------------------------------------------------------------------ */

function laporanDoc(d) {
  const id = d.id
  const meta = d.meta

  return sheet('laporan', `
    <h2 class="doc-title doc-title--laporan">Laporan dan Evaluasi<br>${esc(meta.laporan)}</h2>

    <table class="kv kv--laporan">
      ${identityRows([
    ['Nama Guru', id.nama],
    ['N I P / No. Seri Karpeg', `${text(id.nip, '-')} / ${text(id.karpeg, '-')}`],
    ['Pangkat/Jab. / Gol.', id.pangkat],
    ['TMT Guru', id.tmtGuru],
    ['NUPTK / NRG', `${text(id.nuptk, '-')} / ${text(id.nrg, '-')}`],
  ], '')}
    </table>
    <table class="kv kv--laporan kv--laporan-second">
      ${identityRows([
    ['Nama Sekolah', id.madrasah],
    ['Alamat Sekolah', id.alamat],
    ['Tanggal Mulai bekerja', id.tmtGuru],
    ['Periode Penilaian', `${text(id.periodeAwal)} s.d. ${text(id.periodeAkhir)}`],
  ], '')}
    </table>

    <div class="agreement">
      <h3>PERSETUJUAN</h3>
      <p class="sub">(Persetujuan ini ditandatangani oleh penilai dan guru yang dinilai)</p>
      <p class="body">Penilai dan guru yang dinilai menyatakan telah membaca dan memahami semua aspek yang ditulis /
        dilaporkan dalam format ini dan menyatakan setuju.</p>
      <div class="agreement-cols">
        <div>
          <div class="agree-label">Nama Guru</div>
          <div class="agree-name">${text(id.nama)}</div>
          <div class="agree-nip">${nipLabel(id.nip)}</div>
          <div class="ttd-label">Tanda tangan:</div>
          <div class="ttd-line">.................................</div>
        </div>
        <div>
          <div class="agree-label">Nama Penilai</div>
          <div class="agree-name">${text(id.penilai)}</div>
          <div class="agree-nip">${nipLine(id.nipPenilai)}</div>
          <div class="ttd-label">Tanda tangan:</div>
          <div class="ttd-line">.................................</div>
        </div>
      </div>
      <div class="agreement-date">Tanggal : ${text(id.tanggalPenilaian)}</div>
    </div>`)
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export function buildReport(state, instruments, options = {}) {
  const id = state.identitas || {}
  const inst = instruments.find((i) => i.id === state.instrumenAktif) || instruments[0]
  const meta = metaFor(inst)
  const rekap = rekapKompetensi(inst, state.jawaban || {})
  const kehadiran = kehadiranStats(state.kehadiran || [])
  const kehadiranPct = Math.max(0, Math.min(100, kehadiran.kehadiran * 100))
  const nilaiAkhir = rekap.answered ? (rekap.pct * kehadiranPct) / 100 : 0

  const d = {
    id,
    inst,
    meta,
    rekap,
    kehadiran,
    kehadiranPct,
    nilaiAkhir,
    ak: angkaKredit(id.pangkat, nilaiAkhir),
    jamTugas: options.jamTugas || 0,
    prioritas: options.prioritas || [],
    logo: options.logo || '',
  }

  const cover = coverDoc(d)
  const identitas = identitasDoc(d)
  const prioritas = prioritasDoc(d)
  const rekapPage = rekapDoc(d)
  const akpkb = akpkbDoc(d)
  const laporan = laporanDoc(d)

  const name = String(id.nama || 'Guru').trim() || 'Guru'
  const groups = [
    { id: 'sampul', label: 'Sampul', pages: [cover], filename: '01 - Sampul.pdf' },
    { id: 'identitas', label: 'Identitas Diri', pages: [identitas], filename: '02 - Identitas Diri.pdf' },
    { id: 'prioritas', label: 'Prioritas PKB', pages: [prioritas], filename: '03 - Prioritas PKB.pdf' },
    {
      id: 'rekap',
      label: 'Rekap, Angka Kredit & Laporan Evaluasi',
      pages: [rekapPage, akpkb, laporan],
      filename: '04 - Rekap dan Laporan.pdf',
    },
  ]
  groups.forEach((group) => { group.html = group.pages.join('\n') })

  return {
    groups,
    allHtml: groups.map((g) => g.html).join('\n'),
    combinedFilename: `PKG - ${name}.pdf`,
    name,
  }
}

export function printHtml(sheets, css = '') {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Penilaian Kinerja Guru</title>
<style>${css}</style>
</head>
<body class="report-body">${sheets}</body>
</html>`
}
