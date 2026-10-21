// 各 Mermaid 図の上に「大きく表示」を足し、押すとその図を画面全体に表示する（Esc で戻る）。
// GitHub は画面遷移やコメントの読み込みでページを読み直さないので、DOM の変化を見て新しい図にも付ける
const addButtons = () => {
  for (const section of document.querySelectorAll('section[data-type="mermaid"]')) {
    if (section.previousElementSibling?.dataset.mermaidWide) continue
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'btn btn-sm'
    button.dataset.mermaidWide = '1'
    button.style.margin = '8px 0 4px'
    button.textContent = '大きく表示'
    button.onclick = () => (section.querySelector('iframe') ?? section).requestFullscreen()
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
