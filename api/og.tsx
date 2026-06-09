import { ImageResponse } from '@vercel/og'
import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug') || ''

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  let name = 'TYSM'
  let bio = 'Tip anyone, straight to UPI. No signup, no gateway.'
  let emoji = '💜'
  let avatar: string | null = null

  if (url && key && slug) {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from('creators')
      .select('name,bio,emoji,avatar_url')
      .eq('slug', slug)
      .maybeSingle()
    if (data) {
      name = data.name
      bio = data.bio || `Say thanks to ${data.name} with a tip`
      emoji = data.emoji || '😊'
      avatar = data.avatar_url || null
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
          alignItems: 'center',
          background: '#0a0a09',
          color: '#fffaeb',
          fontFamily: 'Inter, sans-serif',
          position: 'relative',
        }}
      >
        {/* Corner brand */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 48,
            fontSize: 28,
            fontWeight: 800,
            display: 'flex',
          }}
        >
          <span>TY</span>
          <span style={{ color: '#d4ff3f', fontStyle: 'italic' }}>SM</span>
        </div>

        {/* Slug URL */}
        {slug && (
          <div
            style={{
              position: 'absolute',
              top: 44,
              right: 48,
              fontSize: 20,
              color: '#888',
              display: 'flex',
            }}
          >
            tysm.in/{slug}
          </div>
        )}

        {/* Avatar: photo when available, else emoji */}
        {avatar ? (
          <img
            src={avatar}
            width={148}
            height={148}
            style={{
              width: 148,
              height: 148,
              borderRadius: '50%',
              objectFit: 'cover',
              marginBottom: 18,
              border: '4px solid rgba(212,255,63,0.25)',
            }}
          />
        ) : (
          <div style={{ fontSize: 96, marginBottom: 12, display: 'flex' }}>{emoji}</div>
        )}

        {/* Name */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            marginBottom: 8,
            maxWidth: '80%',
            textAlign: 'center',
            display: 'flex',
          }}
        >
          {name}
        </div>

        {/* Bio */}
        <div
          style={{
            fontSize: 24,
            color: '#aaa',
            maxWidth: '70%',
            textAlign: 'center',
            display: 'flex',
          }}
        >
          {bio}
        </div>

        {/* CTA strip */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              background: '#d4ff3f',
              color: '#14160a',
              padding: '12px 28px',
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 700,
              display: 'flex',
            }}
          >
            Tip via UPI →
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
