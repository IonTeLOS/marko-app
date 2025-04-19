// netlify/edge-functions/subdomain-redirect.ts
import type { Config } from '@netlify/edge-functions'

export default async (request: Request, context: any) => {
  const host = request.headers.get('host') || ''
  const [sub, root, tld, ...rest] = host.split('.')

  // Ignore the main site (www) and bare domain
  if (!sub || sub === 'www' || rest.length > 0) {
    return context.next()
  }

  // 301 redirect the browser to /<sub> on the main domain
  return Response.redirect(`https://marko-app.netlify.app/${sub}${new URL(request.url).pathname}`, 301)
}

export const config: Config = { path: '/*' }
