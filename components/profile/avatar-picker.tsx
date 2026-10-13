'use client'

import { Camera, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { BookeyButton } from '@/components/ui-kit/bookey-button'
import { getInitials } from '@/lib/stores/profile'

const MAX_BYTES = 5 * 1024 * 1024
const OUTPUT_SIZE = 160

/** Center-crops and shrinks the image so the stored data URL stays small. */
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const side = Math.min(image.width, image.height)
      const canvas = document.createElement('canvas')
      canvas.width = OUTPUT_SIZE
      canvas.height = OUTPUT_SIZE
      const context = canvas.getContext('2d')
      if (!context) return reject(new Error('Canvas unavailable'))
      context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    image.src = url
  })
}

interface AvatarPickerProps {
  name: string
  value: string | null
  editing: boolean
  onChange: (value: string | null) => void
}

export function AvatarPicker({ name, value, editing, onChange }: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) return setError('Choose an image file (PNG, JPG, WebP or GIF).')
    if (file.size > MAX_BYTES) return setError('That image is over 5 MB. Try a smaller one.')
    try {
      onChange(await resizeToDataUrl(file))
    } catch {
      setError('That image could not be read. Try another file.')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-primary font-display text-3xl font-bold text-primary-foreground ring-4 ring-secondary">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
          <img src={value} alt="Your avatar preview" className="size-full object-cover" />
        ) : (
          <span role="img" aria-label={`Initials avatar for ${name}`}>
            {getInitials(name)}
          </span>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <div className="flex flex-wrap gap-2">
            <BookeyButton size="sm" variant="secondary" onClick={() => inputRef.current?.click()} aria-describedby={error ? errorId : undefined}>
              <Camera aria-hidden="true" />
              {value ? 'Change photo' : 'Upload photo'}
            </BookeyButton>
            {value && (
              <BookeyButton size="sm" variant="ghost" onClick={() => onChange(null)}>
                <Trash2 aria-hidden="true" />
                Remove
              </BookeyButton>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              void handleFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <p className="text-xs text-muted-foreground">Preview only. The image is resized and kept in this browser, never uploaded.</p>
          {error && (
            <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Edit your profile to change the photo.</p>
      )}
    </div>
  )
}
