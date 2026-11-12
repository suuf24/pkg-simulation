import { createServer } from 'node:http'
import { readFile, stat, writeFile, mkdtemp, rm, access } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'app')
const port = Number(process.env.PORT) || 4173
const host = process.env.HOST || '127.0.0.1'

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

/* ------------------------------------------------------------------ */
/* Pencetakan PDF melalui Chrome headless                              */
/* ------------------------------------------------------------------ */

const MAX_HTML_BYTES = 8 * 1024 * 1024
const MAX_PDF_JOBS = 3
const CHROME_TIMEOUT_MS = 60000
let activePdfJobs = 0
let chromePathPromise

function candidatesForChrome() {
  const list = [process.env.CHROME_PATH, process.env.PUPPETEER_EXECUTABLE_PATH]
  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
    const programFiles86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    const localAppData = process.env.LOCALAPPDATA || ''
    list.push(
      join(programFiles, 'Google/Chrome/Application/chrome.exe'),
      join(programFiles86, 'Google/Chrome/Application/chrome.exe'),
      localAppData && join(localAppData, 'Google/Chrome/Application/chrome.exe'),
      join(programFiles, 'Microsoft/Edge/Application/msedge.exe'),
      join(programFiles86, 'Microsoft/Edge/Application/msedge.exe'),
    )
  } else if (process.platform === 'darwin') {
    list.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    )
  } else {
    list.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
    )
  }
  return list.filter(Boolean)
}

async function findChrome() {
  if (!chromePathPromise) {
    chromePathPromise = (async () => {
      for (const candidate of candidatesForChrome()) {
        try {
          await access(candidate, fsConstants.X_OK)
          return candidate
        } catch {
          /* lanjut ke kandidat berikutnya */
        }
      }
      return null
    })()
  }
  return chromePathPromise
}

function runChrome(executable, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true })
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    child.stderr.on('data', (chunk) => {
      if (stderr.length < 8000) stderr += String(chunk)
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) reject(new Error('Chrome melewati batas waktu.'))
      else if (code === 0) resolve()
      else reject(new Error(`Chrome berhenti dengan kode ${code}. ${stderr.slice(-400)}`))
    })
  })
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_HTML_BYTES) {
        const error = new Error('Berkas laporan terlalu besar.')
        error.statusCode = 413
        reject(error)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sanitizeHtml(html) {
  return String(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '')
}

function safeFilename(name) {
  const cleaned = String(name || 'PKG.pdf')
    .replace(/[\\/:*?"<>|\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const withExt = cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`
  return withExt.slice(0, 120) || 'PKG.pdf'
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(payload))
}

async function cleanup(dir) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(dir, { recursive: true, force: true })
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }
}

async function handlePdf(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' }).end()
    return
  }
  if (activePdfJobs >= MAX_PDF_JOBS) {
    sendJson(res, 429, { error: 'busy', message: 'Terlalu banyak permintaan PDF. Coba lagi sebentar.' })
    return
  }

  let payload
  try {
    payload = JSON.parse(await readBody(req))
  } catch (error) {
    sendJson(res, error.statusCode || 400, { error: 'bad_request', message: error.message || 'Permintaan tidak valid.' })
    return
  }

  const html = sanitizeHtml(payload?.html || '')
  if (html.length < 80) {
    sendJson(res, 400, { error: 'empty_report', message: 'Isi laporan kosong.' })
    return
  }

  const chrome = await findChrome()
  if (!chrome) {
    sendJson(res, 503, {
      error: 'chrome_not_found',
      message: 'Chrome/Edge tidak ditemukan. Atur CHROME_PATH atau gunakan tombol Cetak.',
    })
    return
  }

  activePdfJobs += 1
  let dir
  try {
    dir = await mkdtemp(join(tmpdir(), 'pkg-pdf-'))
    const htmlPath = join(dir, 'report.html')
    const pdfPath = join(dir, 'report.pdf')
    await writeFile(htmlPath, html, 'utf8')

    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-background-networking',
      '--metrics-recording-only',
      '--no-pdf-header-footer',
      `--user-data-dir=${join(dir, 'profile')}`,
      `--print-to-pdf=${pdfPath}`,
      pathToFileURL(htmlPath).href,
    ]
    if (process.platform === 'linux' && typeof process.getuid === 'function' && process.getuid() === 0) {
      args.unshift('--no-sandbox')
    }

    await runChrome(chrome, args, CHROME_TIMEOUT_MS)
    const pdf = await readFile(pdfPath)
    if (pdf.length < 800) throw new Error('PDF kosong.')

    const filename = safeFilename(payload?.filename)
    const asciiName = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '')
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    }).end(pdf)
  } catch (error) {
    if (!res.headersSent) {
      sendJson(res, 502, { error: 'pdf_failed', message: String(error?.message || error) })
    }
  } finally {
    activePdfJobs -= 1
    if (dir) void cleanup(dir)
  }
}

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const pathname = decodeURIComponent(url.pathname)

    if (pathname === '/api/pdf') {
      await handlePdf(req, res)
      return
    }
    if (pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'not_found' })
      return
    }

    let targetPath = pathname
    if (targetPath.endsWith('/')) targetPath += 'index.html'
    const target = normalize(join(root, targetPath))
    if (!target.startsWith(root + sep) && target !== root) {
      res.writeHead(403).end('Forbidden')
      return
    }
    const info = await stat(target)
    if (info.isDirectory()) {
      res.writeHead(302, { Location: pathname.replace(/\/?$/, '/') + 'index.html' }).end()
      return
    }
    const body = await readFile(target)
    res.writeHead(200, {
      'Content-Type': types[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    }).end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
  }
})

server.listen(port, host, () => {
  console.log(`PKG webapp running at http://${host}:${port}/`)
})
