import { createAuthProviderConfig } from '../../../../../core/src/auth.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const config = createAuthProviderConfig();
  const response = Response.redirect(new URL('/login', request.url), 302);
  response.headers.append('Set-Cookie', `${config.session.cookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return response;
}
