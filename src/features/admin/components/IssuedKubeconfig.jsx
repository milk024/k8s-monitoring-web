import { Copy, Download, X } from 'lucide-react'
import { toast } from 'sonner'

// 발급 직후 한 번만 보여준다. 서버는 kubeconfig(토큰 포함)를 저장하지 않으므로 이 창을 닫으면
// 다시 받을 수 없다 (필요하면 회수 후 재발급).
export function IssuedKubeconfig({ issued, onClose }) {
  const filename = `${issued.namespace}-${issued.name}.kubeconfig`

  function download() {
    const blob = new Blob([issued.kubeconfig], { type: 'application/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(issued.kubeconfig)
      toast.success('kubeconfig를 복사했습니다')
    } catch {
      toast.error('복사하지 못했습니다. 다운로드를 사용하세요')
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-[var(--cw-warning)] bg-[var(--cw-warning-bg)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="cw-text text-sm font-semibold">
            발급 완료: {issued.namespace}/{issued.name} ({issued.rbacTemplate})
          </h2>
          <p className="cw-muted mt-1 text-xs">
            kubeconfig 에는 1년짜리 접속 토큰이 들어 있습니다. 지금 내려받아 본인에게만 전달하세요.
            이 창을 닫으면 다시 볼 수 없습니다.
          </p>
        </div>
        <button type="button" onClick={onClose} className="cw-muted" aria-label="닫기">
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={download}
          className="cw-accent-bg inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white"
        >
          <Download size={14} /> {filename} 다운로드
        </button>
        <button
          type="button"
          onClick={copy}
          className="cw-surface cw-border cw-text inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:cw-surface-2"
        >
          <Copy size={14} /> 복사
        </button>
      </div>
      <p className="cw-muted text-xs">
        사용: <code className="cw-text">kubectl --kubeconfig {filename} get pods</code>
      </p>
    </div>
  )
}
