import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug') || ''

  const origin = 'https://www.tysm.in'
  let title = 'TYSM — event feedback'
  let description = 'Share a focused feedback form after every meetup, workshop, or community event.'
  const image = `${origin}/api/og?slug=${encodeURIComponent(slug)}`
  const pageUrl = slug ? `${origin}/event/${slug}` : origin

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (url && key && slug) {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from('feedback_events')
      .select('title,description')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (data) {
      title = `${data.title} feedback — TYSM`
      description = data.description || `Share feedback for ${data.title}.`
    }
  }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(image)}" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="TYSM" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(image)}" />
  <meta http-equiv="refresh" content="0;url=${esc(pageUrl)}" />
</head>
<body></body>
</html>`

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=600',
    },
  })
}
