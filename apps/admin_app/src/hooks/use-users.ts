import { useState, useEffect, useCallback } from 'react';
import type { AppUser } from '@/types/user';
import {
  watchUsers,
  updateUser as updateUserService,
  toggleUser as toggleUserService,
  createOperatorUser as createOperatorUserService,
} from '@/services/user.service';

export function useUsers(orgId: string) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = watchUsers(orgId, (data) => {
      setUsers(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [orgId]);

  const updateUser = useCallback(
    async (id: string, data: Partial<AppUser>) => {
      return updateUserService(id, data);
    },
    [],
  );

  const toggleUser = useCallback(
    async (id: string, isActive: boolean) => {
      return toggleUserService(id, isActive);
    },
    [],
  );

  const createOperatorUser = useCallback(
    async (payload: {
      email: string;
      password: string;
      displayName: string;
      orgId: string;
      branchIds: string[];
      role: 'admin' | 'manager' | 'operator';
      stationId?: string;
    }) => {
      return createOperatorUserService(payload);
    },
    [],
  );

  return { users, loading, updateUser, toggleUser, createOperatorUser };
}
