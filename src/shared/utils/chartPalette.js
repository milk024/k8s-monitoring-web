// 검증된 8슬롯 카테고리 팔레트(색약 안전, adjacent-pair ΔE 기준 통과) — 고정 순서로만 배정.
// 순위(사용량 등)에 따라 다시 배정하지 않고, 처음 등장한 순서대로 슬롯을 고정한다.
const CATEGORICAL_PALETTE = [
  { light: '#2a78d6', dark: '#3987e5' }, // blue
  { light: '#eb6834', dark: '#d95926' }, // orange
  { light: '#1baf7a', dark: '#199e70' }, // aqua
  { light: '#eda100', dark: '#c98500' }, // yellow
  { light: '#e87ba4', dark: '#d55181' }, // magenta
  { light: '#008300', dark: '#008300' }, // green
  { light: '#4a3aa7', dark: '#9085e9' }, // violet
  { light: '#e34948', dark: '#e66767' }, // red
]

export function createSeriesColorAssigner() {
  const assigned = new Map()
  return function getSeriesColor(key, theme) {
    if (!assigned.has(key)) {
      assigned.set(key, CATEGORICAL_PALETTE[assigned.size % CATEGORICAL_PALETTE.length])
    }
    return assigned.get(key)[theme === 'light' ? 'light' : 'dark']
  }
}
