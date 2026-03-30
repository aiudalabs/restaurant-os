import { useState, useEffect, useCallback } from 'react';
import type { Branch } from '@/types/branch';
import {
  fetchBranches as fetchBranchesService,
  updateBranch as updateBranchService,
} from '@/services/branch.service';

export function useBranches(branchIds: string[]) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [branchIds.join(',')]);

  const updateBranch = useCallback(
    async (id: string, data: Partial<Branch>) => {
      await updateBranchService(id, data);
      setBranches((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...data } : b)),
      );
    },
    [],
  );

  return { branches, loading, updateBranch };
}
