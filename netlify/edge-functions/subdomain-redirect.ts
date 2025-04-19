// netlify/edge-functions/subdomain-redirect.ts   (TypeScript version)
import type { Config } from '@netlify/edge-functions'

export default async (request: Request) => {
  const url   = new URL(request.url)
  const parts = url.hostname.split('.')        // each hostname label

  /* need ≥ 4 labels ⇒ xy.something.domain.com, api.foo.bar.co.uk, …  */
  if (parts.length <= 3 || parts[0] === 'www') return

  const xy       = parts.shift()!              // 'xy'
  const baseHost = parts.join('.')             // 'something.domain.com'

  /* 301 →  https://something.domain.com/xy/…  */
  return Response.redirect(
    `https://${baseHost}/${xy}${url.pathname}${url.search}`,
    301
  )
}

export const config: Config = { path: '/*' }
