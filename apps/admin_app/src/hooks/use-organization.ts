import { useEffect, useState } from 'react';
import type { Organization } from '@/types/organization';
import { watchOrganization } from '@/services/organization.service';

/** Live organization doc. `loading` stays true until the first snapshot for this orgId. */
export function useOrganization(orgId: string) {
  const [state, setState] = useState<{ orgId: string; org: Organization | null } | null>(null);

  useEffect(() => {
    if (!orgId) return;
    return watchOrganization(orgId, (org) => setState({ orgId, org }));
  }, [orgId]);

  const current = state?.orgId === orgId ? state : null;
  return { organization: current?.org ?? null, loading: !!orgId && current === null };
}
