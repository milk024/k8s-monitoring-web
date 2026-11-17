// Monaco 를 CDN 대신 앱 번들에서 쓰도록 설정한다 (@monaco-editor/react 는 기본이 jsdelivr CDN).
// 이 파일은 CodeEditor 를 처음 열 때만 lazy 로 불러온다 — Monaco 는 크기가 커서 첫 화면 로딩에 넣지 않는다.
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'
import { loader } from '@monaco-editor/react'

// YAML 은 언어 서비스 worker 가 없어 기본 editor worker 만 있으면 된다
self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker()
  },
}

// 앱 색(index.css 의 --cw-*)에 맞춘 테마. 로그 화면과 같은 짙은 남색 바탕
monaco.editor.defineTheme('cw-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'type', foreground: '7cc4ff' }, // YAML key
    { token: 'string', foreground: 'a5d6a7' },
    { token: 'number', foreground: 'ffcc80' },
    { token: 'keyword', foreground: 'ce93d8' },
    { token: 'comment', foreground: '6b7a8a', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#0b1220',
    'editor.lineHighlightBackground': '#16222e',
    'editorLineNumber.foreground': '#4a5a6a',
    'editorLineNumber.activeForeground': '#9fb0c0',
    'editorGutter.background': '#0b1220',
    'editor.selectionBackground': '#264f78',
    'editorIndentGuide.background1': '#1f2d3b',
    'editorWidget.background': '#16222e',
    'editorWidget.border': '#2a3f52',
  },
})
monaco.editor.defineTheme('cw-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'type', foreground: '0b5cad' },
    { token: 'string', foreground: '1b7f3b' },
    { token: 'number', foreground: 'b7580b' },
    { token: 'comment', foreground: '8a96a3', fontStyle: 'italic' },
  ],
  colors: {
    'editor.background': '#fafbfc',
    'editor.lineHighlightBackground': '#eef3f8',
    'editorLineNumber.foreground': '#a0abb6',
    'editorGutter.background': '#fafbfc',
  },
})

loader.config({ monaco })

export { monaco }
