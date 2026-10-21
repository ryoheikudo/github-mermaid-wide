// 各 Mermaid 図の上に「大きく表示」を足し、押すとその図を画面全体に表示する（Esc で戻る）。
// GitHub は画面遷移やコメントの読み込みでページを読み直さないので、DOM の変化を見て新しい図にも付ける
// 全画面のあいだの移動・拡大縮小は、iframe の中で動く viewer.js が受け持つ
let wideFrame = null

// iframe は別ドメインなので、全画面になったこと・戻ったことを postMessage で viewer.js に伝える
const tellFrame = (frame, mermaidWide) => {
  frame.contentWindow?.postMessage({ mermaidWide }, new URL(frame.src).origin)
}

const openWide = async (section) => {
  const frame = section.querySelector('iframe')
  if (!frame) return section.requestFullscreen()
  await frame.requestFullscreen()
  wideFrame = frame
  frame.focus()
  tellFrame(frame, true)
}

document.addEventListener('fullscreenchange', () => {
  if (!wideFrame || document.fullscreenElement === wideFrame) return
  tellFrame(wideFrame, false)
  wideFrame = null
})

const addButtons = () => {
  for (const section of document.querySelectorAll('section[data-type="mermaid"]')) {
    if (section.previousElementSibling?.dataset.mermaidWide) continue
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'btn btn-sm'
    button.dataset.mermaidWide = '1'
    button.style.margin = '8px 0 4px'
    button.textContent = '大きく表示'
    button.onclick = () => openWide(section)
    section.before(button)
  }
}

let scheduled = false
new MutationObserver(() => {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    addButtons()
  })
}).observe(document.documentElement, { childList: true, subtree: true })

addButtons()
