// netlify/edge-functions/subdomain-redirect.ts
import type { Config } from '@netlify/edge-functions'

export default async (request: Request) => {
  const url      = new URL(request.url)
  const segments = url.hostname.split('.')     // ['xy','something','domain','com']

  /* we only redirect true “sub‑subdomain” requests */
  if (segments.length < 3 || segments[0] === 'www') return

  const xy       = segments.shift()!           // 'xy'
  const baseHost = segments.join('.')          // 'something.domain.com'

  /* 301 →  https://something.domain.com/xy/original/path?qs */
  return Response.redirect(
    `https://${baseHost}/${xy}${url.pathname}${url.search}`,
    301
  )
}

/* run on every request */
export const config: Config = { path: '/*' }
