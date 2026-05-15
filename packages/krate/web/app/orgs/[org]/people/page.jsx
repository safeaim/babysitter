export const dynamic = 'force-dynamic';

import { PeoplePage } from '../../../ui-shell.jsx';
export const metadata = { title: 'People | Krate' };


export default async function Page({ params }) {
  const routeParams = await params;
  const org = routeParams.org;
  const repo = routeParams.repo;
  return <PeoplePage org={org} />;
}
