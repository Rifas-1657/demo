import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/editor/editor.api'
import 'monaco-editor/languages/definitions/python/register'

declare global {
  interface Window {
    MonacoEnvironment?: { getWorker: (moduleId: string, label: string) => Worker }
  }
}

let configured = false

/** Serve Monaco from the bundled `monaco-editor` package instead of the jsDelivr default. */
export function configureLocalMonaco() {
  if (configured) return
  configured = true
  window.MonacoEnvironment = {
    getWorker: () => new Worker(new URL('monaco-editor/editor/editor.worker.js', import.meta.url)),
  }
  loader.config({ monaco })
}
