import { useState, useEffect, useCallback } from 'react';
import type { Station } from '@/types/station';
import {
  watchStations,
  createStation as createStationService,
  updateStation as updateStationService,
  deleteStation as deleteStationService,
  toggleStation as toggleStationService,
} from '@/services/station.service';

export function useStations(orgId: string, branchId: string) {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId || !branchId) {
      setStations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = watchStations(orgId, branchId, (data) => {
      setStations(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [orgId, branchId]);

  const createStation = useCallback(
    async (data: Omit<Station, 'id'>) => {
      return createStationService(data);
    },
    [],
  );

  const updateStation = useCallback(
    async (id: string, data: Partial<Station>) => {
      return updateStationService(id, data);
    },
    [],
  );

  const deleteStation = useCallback(async (id: string) => {
    return deleteStationService(id);
  }, []);

  const toggleStation = useCallback(
    async (id: string, isActive: boolean) => {
      return toggleStationService(id, isActive);
    },
    [],
  );

  return { stations, loading, createStation, updateStation, deleteStation, toggleStation };
}
