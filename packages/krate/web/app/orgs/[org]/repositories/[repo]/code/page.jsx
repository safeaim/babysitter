export const dynamic = 'force-dynamic';

import { RepositoryCodePage } from '../../../../../ui-shell.jsx';
export const metadata = { title: 'Code | Krate' };


export default async function Page({ params }) {
  const routeParams = await params;
  const org = routeParams.org;
  const repo = routeParams.repo;
  return <RepositoryCodePage org={org} repo={repo} />;
}
