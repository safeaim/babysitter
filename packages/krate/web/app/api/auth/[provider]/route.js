import { buildAuthorizationRedirect, createAuthProviderConfig } from '../../../../../core/src/auth.js';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { provider } = await params;
  const config = createAuthProviderConfig();
  const selected = config.providers[provider];
  if (!selected) return Response.json({ error: 'not_found', message: 'Sign-in provider is not available' }, { status: 404 });
  try {
    const redirect = buildAuthorizationRedirect({ provider: selected, requestUrl: request.url });
    return Response.redirect(redirect.url, 302);
  } catch (error) {
    return Response.json({ error: 'disabled', message: error.message }, { status: 400 });
  }
}
