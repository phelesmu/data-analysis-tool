import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const root = process.env.PROJECT_ROOT ? resolve(process.env.PROJECT_ROOT) : process.cwd()
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const appUrl = process.env.APP_URL || process.argv[2] || 'http://127.0.0.1:5001/'
const csvPath = join(root, 'data/demo_data_analysis_tool.csv')
const outputDir = join(root, 'docs/assets/tutorial')
const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9335)
const userDataDir = `/private/tmp/data-analysis-tool-tutorial-chrome-${Date.now()}`

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return response.json()
}

async function waitForJson(url, timeoutMs = 10000) {
  const startedAt = Date.now()
  let lastError

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await fetchJson(url)
    } catch (error) {
      lastError = error
      await sleep(150)
    }
  }

  throw lastError || new Error(`Timed out waiting for ${url}`)
}

function connectCdp(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let nextId = 1
  const pending = new Map()
  const eventListeners = new Set()

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)

    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) {
        reject(new Error(`${message.error.message}: ${JSON.stringify(message.error.data || '')}`))
      } else {
        resolve(message.result || {})
      }
      return
    }

    for (const listener of eventListeners) {
      listener(message)
    }
  })

  const opened = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  const send = async (method, params = {}) => {
    await opened
    const id = nextId++
    const payload = JSON.stringify({ id, method, params })
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      ws.send(payload)
    })
  }

  const waitForEvent = async (method, timeoutMs = 10000) => {
    await opened
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventListeners.delete(listener)
        reject(new Error(`Timed out waiting for event ${method}`))
      }, timeoutMs)

      const listener = (message) => {
        if (message.method !== method) return
        clearTimeout(timeout)
        eventListeners.delete(listener)
        resolve(message.params || {})
      }

      eventListeners.add(listener)
    })
  }

  return { send, waitForEvent, close: () => ws.close() }
}

async function main() {
  await mkdir(outputDir, { recursive: true })

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,1100',
    'about:blank',
  ], {
    stdio: 'ignore',
  })

  let cdp

  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`)
    const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`)
    const pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl)
    if (!pageTarget) {
      throw new Error('Could not find a Chrome page target')
    }

    cdp = connectCdp(pageTarget.webSocketDebuggerUrl)
    const { send, waitForEvent } = cdp

    await send('Page.enable')
    await send('DOM.enable')
    await send('Runtime.enable')
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false,
    })

    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      })

      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed')
      }

      return result.result?.value
    }

    async function waitForExpression(expression, timeoutMs = 10000) {
      const startedAt = Date.now()
      while (Date.now() - startedAt < timeoutMs) {
        if (await evaluate(expression)) return
        await sleep(200)
      }
      throw new Error(`Timed out waiting for expression: ${expression}`)
    }

    async function navigate(url) {
      const loaded = waitForEvent('Page.loadEventFired')
      await send('Page.navigate', { url })
      await loaded
      await sleep(500)
    }

    async function capture(filename) {
      const { data } = await send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      })
      await writeFile(join(outputDir, filename), Buffer.from(data, 'base64'))
    }

    async function clickText(text) {
      const clicked = await evaluate(`
        (() => {
          const targets = Array.from(document.querySelectorAll('[role="tab"],button'));
          const target = targets.find((element) => element.textContent && element.textContent.includes(${JSON.stringify(text)}));
          if (!target) return false;
          target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }));
          target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
          target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
          target.click();
          return true;
        })()
      `)

      if (!clicked) {
        throw new Error(`Could not click text: ${text}`)
      }

      await waitForExpression(`
        (() => {
          const active = document.querySelector('[role="tab"][aria-selected="true"], [role="tab"][data-state="active"]');
          return active && active.textContent && active.textContent.includes(${JSON.stringify(text)});
        })()
      `, 5000)
      await sleep(700)
    }

    async function scrollTo(y) {
      await evaluate(`window.scrollTo(0, ${Number(y)})`)
      await sleep(350)
    }

    await navigate(appUrl)
    await capture('01-upload-empty.png')

    const documentResult = await send('DOM.getDocument', { depth: -1, pierce: true })
    const inputResult = await send('DOM.querySelector', {
      nodeId: documentResult.root.nodeId,
      selector: 'input[type="file"]',
    })
    if (!inputResult.nodeId) {
      throw new Error('Could not find file input')
    }

    await send('DOM.setFileInputFiles', {
      nodeId: inputResult.nodeId,
      files: [csvPath],
    })

    await evaluate(`
      (() => {
        const input = document.querySelector('input[type="file"]');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `)

    await waitForExpression(`document.body.innerText.includes('64 行') && document.body.innerText.includes('数据预览')`, 15000)
    await scrollTo(0)
    await sleep(1000)
    await capture('10-overview-after-upload.png')

    await clickText('图表')
    await scrollTo(650)
    await capture('11-charts-tab.png')

    await clickText('统计')
    await scrollTo(650)
    await capture('12-statistics-tab.png')

    await clickText('相关性')
    await scrollTo(650)
    await capture('13-correlation-tab.png')

    await clickText('分组')
    await scrollTo(650)
    await capture('14-groupby-tab.png')

    await clickText('时间')
    await scrollTo(650)
    await capture('15-time-compare-tab.png')

    await clickText('SQL')
    await scrollTo(650)
    await capture('16-sql-tab.png')

    await send('Browser.close').catch(() => {})
    cdp.close()
  } finally {
    chrome.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
