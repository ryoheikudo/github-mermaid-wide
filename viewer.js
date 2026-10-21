// 図の iframe（viewscreen）の中で動き、全画面のあいだだけ地図のように動かせるようにする。
// GitHub の操作はボタンだけなので、スクロール・ドラッグで移動し、ピンチ・⌘ / Ctrl + スクロールでカーソルの位置を中心に拡大縮小する。
// 全画面になったかは iframe の中からは分からないので、github.com 側の content.js から postMessage で教えてもらう
const MIN_SCALE = 0.1
const MAX_SCALE = 20

let wide = false
let scale = 1
let x = 0
let y = 0
// 変形していないときの svg の左上（画面上の位置）。translate はここからのずれ
let base = { left: 0, top: 0, width: 0, height: 0 }
let drag = null
let dragged = false

const svg = () => document.querySelector('.mermaid-view svg')

const apply = () => {
  const el = svg()
  if (!el) return
  el.style.transformOrigin = '0 0'
  el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
  zoomLabel.textContent = `${Math.round(scale * 100)}%`
}

const measure = () => {
  const el = svg()
  if (!el) return false
  el.style.transform = 'none'
  const rect = el.getBoundingClientRect()
  base = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
  return rect.width > 0 && rect.height > 0
}

// 図全体が画面に収まる大きさにして、真ん中に置く
const fit = () => {
  if (!measure()) return
  scale = Math.min(innerWidth / base.width, (innerHeight - toolbar.offsetHeight) / base.height) * 0.95
  scale = Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE)
  x = innerWidth / 2 - (base.width * scale) / 2 - base.left
  y = (innerHeight - toolbar.offsetHeight) / 2 - (base.height * scale) / 2 - base.top
  apply()
}

// 画面上の (cx, cy) が指している図の位置を動かさずに、倍率を factor 倍にする
const zoomAt = (factor, cx = innerWidth / 2, cy = innerHeight / 2) => {
  const next = Math.min(Math.max(scale * factor, MIN_SCALE), MAX_SCALE)
  const px = (cx - base.left - x) / scale
  const py = (cy - base.top - y) / scale
  x = cx - base.left - px * next
  y = cy - base.top - py * next
  scale = next
  apply()
}

const panBy = (dx, dy) => {
  x += dx
  y += dy
  apply()
}

const onWheel = (event) => {
  event.preventDefault()
  // deltaMode が行単位（マウスホイールの一部）でも、ピクセルとして扱えるようにする
  const unit = event.deltaMode === 1 ? 16 : 1
  const dx = event.deltaX * unit
  const dy = event.deltaY * unit
  // トラックパッドのピンチは ctrlKey 付きの wheel として届く
  if (event.ctrlKey || event.metaKey) {
    zoomAt(Math.exp(-Math.min(Math.max(dy, -50), 50) * 0.01), event.clientX, event.clientY)
  } else if (event.shiftKey && dx === 0) {
    panBy(-dy, 0)
  } else {
    panBy(-dx, -dy)
  }
}

const onPointerDown = (event) => {
  if (event.button !== 0 || toolbar.contains(event.target)) return
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY }
  dragged = false
  document.documentElement.setPointerCapture(event.pointerId)
  document.documentElement.classList.add('mermaid-wide-dragging')
}

const onPointerMove = (event) => {
  if (!drag || event.pointerId !== drag.id) return
  const dx = event.clientX - drag.x
  const dy = event.clientY - drag.y
  // 少し動いただけなら、図の中のリンクのクリックとして扱う
  if (!dragged && Math.hypot(dx, dy) < 4) return
  dragged = true
  drag.x = event.clientX
  drag.y = event.clientY
  panBy(dx, dy)
}

const onPointerUp = (event) => {
  if (!drag || event.pointerId !== drag.id) return
  drag = null
  document.documentElement.classList.remove('mermaid-wide-dragging')
}

// ドラッグで動かしたあとのクリックで、図の中のリンクが開かないようにする
const onClick = (event) => {
  if (!dragged) return
  dragged = false
  event.preventDefault()
  event.stopPropagation()
}

const onDoubleClick = (event) => {
  if (toolbar.contains(event.target)) return
  event.preventDefault()
  zoomAt(event.shiftKey ? 0.5 : 2, event.clientX, event.clientY)
}

const onKeyDown = (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const step = event.shiftKey ? 400 : 100
  const actions = {
    ArrowLeft: () => panBy(step, 0),
    ArrowRight: () => panBy(-step, 0),
    ArrowUp: () => panBy(0, step),
    ArrowDown: () => panBy(0, -step),
    '+': () => zoomAt(1.25),
    '=': () => zoomAt(1.25),
    '-': () => zoomAt(0.8),
    0: fit,
    1: () => zoomAt(1 / scale),
  }
  const action = actions[event.key]
  if (!action) return
  event.preventDefault()
  action()
}

const button = (label, title, onclick) => {
  const el = document.createElement('button')
  el.type = 'button'
  el.textContent = label
  el.title = title
  el.onclick = onclick
  return el
}

const toolbar = document.createElement('div')
toolbar.className = 'mermaid-wide-toolbar'
const zoomLabel = button('100%', '実際の大きさ（1）', () => zoomAt(1 / scale))
toolbar.append(
  button('−', '縮小（-）', () => zoomAt(0.8)),
  zoomLabel,
  button('+', '拡大（+）', () => zoomAt(1.25)),
  button('全体', '全体を表示（0）', fit),
  Object.assign(document.createElement('span'), {
    textContent: 'ドラッグ・スクロールで移動 / ピンチ・⌘ + スクロールで拡大縮小 / ダブルクリックで拡大 / Esc で戻る',
  }),
)

// 全画面にすると iframe の幅が変わり、GitHub が svg を描き直して差し替えるので、そのたびに合わせ直す
const rerendered = new MutationObserver(() => {
  if (wide) requestAnimationFrame(fit)
})

const listeners = [
  ['wheel', onWheel, { passive: false }],
  ['pointerdown', onPointerDown],
  ['pointermove', onPointerMove],
  ['pointerup', onPointerUp],
  ['pointercancel', onPointerUp],
  ['click', onClick, { capture: true }],
  ['dblclick', onDoubleClick],
  ['keydown', onKeyDown],
]

const enter = () => {
  if (wide) return
  wide = true
  document.documentElement.classList.add('mermaid-wide')
  document.body.append(toolbar)
  for (const [type, listener, options] of listeners) addEventListener(type, listener, options)
  const view = document.querySelector('.mermaid-view')
  if (view) rerendered.observe(view, { childList: true, subtree: true })
  window.focus()
  fit()
}

const leave = () => {
  if (!wide) return
  wide = false
  drag = null
  document.documentElement.classList.remove('mermaid-wide', 'mermaid-wide-dragging')
  toolbar.remove()
  for (const [type, listener, options] of listeners) removeEventListener(type, listener, options)
  rerendered.disconnect()
  const el = svg()
  if (el) {
    el.style.transform = ''
    el.style.transformOrigin = ''
  }
}

addEventListener('message', (event) => {
  if (event.source !== window.parent || event.origin !== 'https://github.com') return
  if (typeof event.data?.mermaidWide !== 'boolean') return
  event.data.mermaidWide ? enter() : leave()
})
