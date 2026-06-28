import { ImageResponse } from '@vercel/og'
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug') || ''

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  let name = 'TYSM'
  let description = 'Event feedback, with gratitude.'
  let date = 'tysm.in'

  if (url && key && slug) {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from('feedback_events')
      .select('title,description,event_date')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (data) {
      name = data.title
      description = data.description || 'Share your feedback for this event.'
      date = data.event_date || `tysm.in/event/${slug}`
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#0b0b09',
          color: '#f6f2e9',
          fontFamily: 'Inter, sans-serif',
          padding: 56,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 48,
            fontSize: 30,
            fontWeight: 800,
            display: 'flex',
          }}
        >
          <span>TY</span>
          <span style={{ color: '#d4ff3f', fontStyle: 'italic' }}>SM</span>
        </div>

        <div
          style={{
            color: '#d4ff3f',
            border: '1px solid rgba(212,255,63,0.38)',
            borderRadius: 8,
            padding: '8px 13px',
            fontSize: 20,
            fontWeight: 700,
            width: 'fit-content',
            display: 'flex',
          }}
        >
          EVENT FEEDBACK
        </div>

        <div
          style={{
            fontSize: 64,
            fontWeight: 760,
            lineHeight: 1.02,
            marginTop: 26,
            maxWidth: 900,
            display: 'flex',
          }}
        >
          {name}
        </div>

        <div
          style={{
            color: '#b0a99c',
            fontSize: 28,
            lineHeight: 1.35,
            marginTop: 18,
            maxWidth: 760,
            display: 'flex',
          }}
        >
          {description}
        </div>

        <div
          style={{
            position: 'absolute',
            right: 52,
            bottom: 44,
            color: '#0b0b09',
            background: '#d4ff3f',
            borderRadius: 8,
            padding: '14px 24px',
            fontSize: 24,
            fontWeight: 800,
            display: 'flex',
          }}
        >
          {date}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
