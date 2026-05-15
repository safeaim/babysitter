export const dynamic = 'force-dynamic';

import { ExternalConflictsPage } from '../../../../ui-shell.jsx';
export const metadata = { title: 'External Conflicts | Krate' };


export default async function Page({ params }) {
  const routeParams = await params;
  const org = routeParams.org;
  return <ExternalConflictsPage org={org} />;
}
