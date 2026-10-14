/**
 * Mapping of Python demo pages to prebuilt ElevenLabs Eleven v4 audio assets.
 * 
 * Provides static audio URL resolution for the 8 Python demo pages so that
 * narration playback executes with 0 live TTS calls, 0 latency, and 0 credit burn.
 */

export const PYTHON_DEMO_AUDIO_MAP: Record<string, string> = {
  lesson_python_1_1: '/audio/python-demo/page-01.mp3',
  lesson_python_1_2: '/audio/python-demo/page-02.mp3',
  lesson_python_1_3: '/audio/python-demo/page-03.mp3',
  lesson_python_1_4: '/audio/python-demo/page-04.mp3',
  lesson_python_1_5: '/audio/python-demo/page-05.mp3',
  lesson_python_1_6: '/audio/python-demo/page-06.mp3',
  lesson_python_2_1: '/audio/python-demo/page-07.mp3',
  lesson_python_2_2: '/audio/python-demo/page-08.mp3',
}

/**
 * Returns the public path to the prebuilt audio asset for a given course and page,
 * or null if no prebuilt asset exists (e.g. other courses or un-prebuilt pages).
 */
export function getPrebuiltAudioUrl(courseId: string, pageId: string): string | null {
  if (courseId.toLowerCase() !== 'python') return null
  return PYTHON_DEMO_AUDIO_MAP[pageId] ?? null
}
