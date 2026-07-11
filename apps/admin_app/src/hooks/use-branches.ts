import { useState, useEffect, useCallback } from 'react';
import type { Branch } from '@/types/branch';
import {
  fetchBranches as fetchBranchesService,
  watchBranchesByOrg,
  createBranch as createBranchService,
  updateBranch as updateBranchService,
  type NewBranch,
} from '@/services/branch.service';

/**
 * Owners/admins see every branch in their org (live). Other roles see only the
 * branches assigned to them. Listing by org is what makes a new branch appear
 * in the switcher the instant it's created.
 */
export function useBranches(orgId: string, branchIds: string[], byOrg: boolean) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (byOrg && orgId) {
      setLoading(true);
      const unsub = watchBranchesByOrg(orgId, (data) => {
        setBranches(data);
        setLoading(false);
      });
      return unsub;
    }
    if (!branchIds.length) {
      setBranches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchBranchesService(branchIds)
      .then(setBranches)
      .catch((err) => {
        console.error('fetchBranches error:', err);
        setBranches([]);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byOrg, orgId, branchIds.join(',')]);

  const createBranch = useCallback(async (data: NewBranch) => {
    return createBranchService(data);
  }, []);

  const updateBranch = useCallback(async (id: string, data: Partial<Branch>) => {
    await updateBranchService(id, data);
    setBranches((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
  }, []);

  return { branches, loading, createBranch, updateBranch };
}
