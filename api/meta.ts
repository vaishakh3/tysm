import { createClient } from '@supabase/supabase-js'

export const config = { runtime: 'edge' }

const ORIGIN = 'https://www.tysm.in'

function absoluteUrl(value: string | null | undefined, origin = ORIGIN) {
  if (!value) return null
  try {
    return new URL(value, origin).toString()
  } catch {
    return null
  }
}

function imageType(image: string) {
  const pathname = (() => {
    try {
      return new URL(image).pathname.toLowerCase()
    } catch {
      return image.toLowerCase()
    }
  })()

  if (pathname.includes('/api/og')) return 'image/png'
  if (pathname.endsWith('.png')) return 'image/png'
  if (pathname.endsWith('.webp')) return 'image/webp'
  if (pathname.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug') || ''

  let title = 'TYSM — event feedback'
  let description = 'Share a focused feedback form after every workshop, launch, or community event.'
  let image = `${ORIGIN}/api/og?slug=${encodeURIComponent(slug)}`
  const pageUrl = slug ? `${ORIGIN}/event/${slug}` : ORIGIN
  let imageAlt = 'TYSM event feedback preview'
  let imageWidth: string | null = '1200'
  let imageHeight: string | null = '630'

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (url && key && slug) {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from('feedback_events')
      .select('title,description,image_url')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()

    if (data) {
      title = `${data.title} feedback — TYSM`
      description = data.description || `Share feedback for ${data.title}.`
      image = absoluteUrl(data.image_url) || image
      imageAlt = data.image_url ? `${data.title} event photo` : `${data.title} feedback preview`
      if (data.image_url) {
        imageWidth = null
        imageHeight = null
      }
    }
  }

  const resolvedImageType = imageType(image)
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const imageSizeMeta =
    imageWidth && imageHeight
      ? `
  <meta property="og:image:width" content="${esc(imageWidth)}" />
  <meta property="og:image:height" content="${esc(imageHeight)}" />`
      : ''

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <link rel="canonical" href="${esc(pageUrl)}" />
  <meta name="description" content="${esc(description)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(image)}" />
  <meta property="og:image:secure_url" content="${esc(image)}" />
  <meta property="og:image:type" content="${esc(resolvedImageType)}" />${imageSizeMeta}
  <meta property="og:image:alt" content="${esc(imageAlt)}" />
  <meta property="og:url" content="${esc(pageUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="TYSM" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(image)}" />
  <meta name="twitter:image:alt" content="${esc(imageAlt)}" />
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
