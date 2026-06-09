import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

/** Renders a QR code for the given value into a canvas. */
export function Qr({ value, size = 200 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 0,
      color: { dark: '#14130f', light: '#fbfaf4' },
    }).catch(() => {})
  }, [value, size])

  return <canvas ref={ref} className="qr-canvas" width={size} height={size} />
}
