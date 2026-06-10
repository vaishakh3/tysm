import { useEffect, useMemo, useRef, useState } from 'react'

const MAX_SECONDS = 60

/** Optional video capture: record from webcam (MediaRecorder) or upload a file. */
export function VideoRecorder({
  value,
  onChange,
}: {
  value: File | null
  onChange: (file: File | null) => void
}) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value])

  const liveRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const canRecord =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== 'undefined' &&
    'MediaRecorder' in window

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  useEffect(() => () => stopStream(), [])

  const pickMime = () => {
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    return types.find((t) => MediaRecorder.isTypeSupported(t)) || ''
  }

  const start = async () => {
    setError(null)
    onChange(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      })
      streamRef.current = stream
      if (liveRef.current) {
        liveRef.current.srcObject = stream
        await liveRef.current.play().catch(() => {})
      }
      const mime = pickMime()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const type = rec.mimeType || 'video/webm'
        const ext = type.includes('mp4') ? 'mp4' : 'webm'
        const blob = new Blob(chunksRef.current, { type })
        stopStream()
        setRecording(false)
        if (blob.size > 0) onChange(new File([blob], `testimonial.${ext}`, { type }))
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1
          if (next >= MAX_SECONDS && rec.state === 'recording') rec.stop()
          return next
        })
      }, 1000)
    } catch {
      setError('Couldn’t access your camera. Check permissions, or upload a file instead.')
      stopStream()
      setRecording(false)
    }
  }

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const onPickFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setError('Please choose a video file.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Video is too large — keep it under 50 MB.')
      return
    }
    setError(null)
    onChange(file)
  }

  return (
    <div className="vid-capture">
      {recording ? (
        <div className="vid-stage">
          <video ref={liveRef} className="vid-live" muted playsInline />
          <div className="vid-rec-bar">
            <span className="vid-rec-dot" /> {elapsed}s / {MAX_SECONDS}s
          </div>
          <button type="button" className="btn btn-sm danger-btn" onClick={stop}>
            Stop recording
          </button>
        </div>
      ) : previewUrl ? (
        <div className="vid-stage">
          <video className="vid-live" src={previewUrl} controls playsInline />
          <div className="vid-actions">
            {canRecord && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={start}>
                Re-record
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>
              Remove video
            </button>
          </div>
        </div>
      ) : (
        <div className="vid-actions">
          {canRecord && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={start}>
              🎥 Record a video
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(e) => {
              onPickFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
            Upload a video
          </button>
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
