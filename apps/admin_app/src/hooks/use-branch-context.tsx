import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Branch } from '@/types/branch';
import { useAuth } from './use-auth';
import { useBranches } from './use-branches';

const STORAGE_KEY = 'ros_selected_branch';

interface BranchContextValue {
  branches: Branch[];
  selectedBranch: Branch | null;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  updateBranch: (id: string, data: Partial<Branch>) => Promise<void>;
  loading: boolean;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function useBranchContext() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranchContext must be used within BranchProvider');
  return ctx;
}

export function BranchProvider({ children }: { children: ReactNode }) {
  const { appUser } = useAuth();
  const branchIds = appUser?.branchIds ?? [];
  const { branches, loading, updateBranch } = useBranches(branchIds);

  const [selectedBranchId, setSelectedBranchIdState] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ?? '';
  });

  // Once branches load, validate the selected ID
  useEffect(() => {
    if (loading || branches.length === 0) return;
    const valid = branches.some((b) => b.id === selectedBranchId);
    if (!valid) {
      const fallback = branches[0].id;
      setSelectedBranchIdState(fallback);
      localStorage.setItem(STORAGE_KEY, fallback);
    }
  }, [branches, loading, selectedBranchId]);

  const setSelectedBranchId = useCallback((id: string) => {
    setSelectedBranchIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) ?? branches[0] ?? null;

  return (
    <BranchContext.Provider
      value={{
        branches,
        selectedBranch,
        selectedBranchId: selectedBranch?.id ?? '',
        setSelectedBranchId,
        updateBranch,
        loading,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}
