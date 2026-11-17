// 밑줄형 탭 (관리자 화면과 같은 모양). tabs: [{ key, label, badge? }]
export function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="cw-border flex flex-wrap gap-1 border-b">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-sm font-medium ${
            value === t.key ? 'cw-text border-[var(--cw-accent)]' : 'cw-muted border-transparent hover:cw-text'
          }`}
        >
          {t.label}
          {t.badge ? (
            <span className="rounded-full bg-[var(--cw-alarm-bg)] px-1.5 text-[10px] font-semibold text-[var(--cw-alarm)]">{t.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
