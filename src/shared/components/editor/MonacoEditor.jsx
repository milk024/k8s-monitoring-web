import { useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { monaco } from './monacoSetup.js'
import { useAppState } from '../../../core/AppState.ts'
import { Loader } from '../Loader.jsx'

// error: { line, column?, message } 를 주면 그 위치에 빨간 밑줄(marker)을 그린다
export default function MonacoEditor({ value, onChange, readOnly = false, language = 'yaml', onSave, height = '60vh', error }) {
  const theme = useAppState((s) => s.theme)
  // addCommand 는 에디터 생성 때 한 번만 등록되므로 최신 onSave 를 ref 로 넘긴다
  const onSaveRef = useRef(onSave)
  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  const editorRef = useRef(null)

  useEffect(() => {
    const model = editorRef.current?.getModel()
    if (!model) return
    const markers = error?.line
      ? [{
        severity: monaco.MarkerSeverity.Error,
        message: error.message,
        startLineNumber: error.line,
        startColumn: error.column ?? 1,
        endLineNumber: error.line,
        endColumn: model.getLineMaxColumn(Math.min(error.line, model.getLineCount())),
      }]
      : []
    monaco.editor.setModelMarkers(model, 'cw-validate', markers)
  }, [error, value])

  function onMount(editor) {
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSaveRef.current?.())
  }

  return (
    <Editor
      height={height}
      language={language}
      theme={theme === 'dark' ? 'cw-dark' : 'cw-light'}
      value={value}
      onChange={(v) => onChange?.(v ?? '')}
      onMount={onMount}
      loading={<Loader />}
      options={{
        readOnly,
        domReadOnly: readOnly,
        readOnlyMessage: { value: '읽기 전용입니다' },
        minimap: { enabled: false },
        fontSize: 12.5,
        fontFamily: "'JetBrains Mono', 'D2Coding', Consolas, 'Courier New', monospace",
        lineHeight: 20,
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: false,
        renderWhitespace: 'boundary',
        scrollBeyondLastLine: false,
        wordWrap: 'off',
        folding: true,
        guides: { indentation: true },
        automaticLayout: true,
        padding: { top: 8, bottom: 8 },
        stickyScroll: { enabled: true },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  )
}
