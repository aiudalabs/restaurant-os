import { useState, useEffect, useCallback } from 'react';
import type { Table } from '@/types/table';
import {
  watchTables,
  createTable as createTableService,
  updateTable as updateTableService,
  deleteTable as deleteTableService,
  toggleTable as toggleTableService,
} from '@/services/table.service';

export function useTables(orgId: string, branchId: string) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !branchId) {
      setTables([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = watchTables(orgId, branchId, (data) => {
      setTables(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [orgId, branchId]);

  const createTable = useCallback(
    async (data: Omit<Table, 'id'>) => {
      return createTableService(data);
    },
    [],
  );

  const updateTable = useCallback(
    async (id: string, data: Partial<Table>) => {
      return updateTableService(id, data);
    },
    [],
  );

  const deleteTable = useCallback(async (id: string) => {
    return deleteTableService(id);
  }, []);

  const toggleTable = useCallback(
    async (id: string, isActive: boolean) => {
      return toggleTableService(id, isActive);
    },
    [],
  );

  return { tables, loading, createTable, updateTable, deleteTable, toggleTable };
}
