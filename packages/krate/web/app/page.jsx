import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  redirect('/orgs/' + (process.env.KRATE_ORG || 'default'));
}
