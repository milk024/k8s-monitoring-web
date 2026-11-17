import { lazy, Suspense } from 'react'
import { Loader } from '../Loader.jsx'

// Monaco 코드 편집기. 처음 쓸 때만 Monaco 번들을 내려받는다(코드 분할).
//   value / onChange(text) / readOnly / language(기본 yaml) / onSave(Ctrl+S) / height
const MonacoEditor = lazy(() => import('./MonacoEditor.jsx'))

export function CodeEditor(props) {
  return (
    <Suspense fallback={<Loader />}>
      <MonacoEditor {...props} />
    </Suspense>
  )
}
