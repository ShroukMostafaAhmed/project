"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "./api";
import {
  ShareholderDto,
  UnitDto,
  ApartmentDto,
  ApartmentOwnershipDto,
  CreateShareholderDto,
  UpdateShareholderDto,
  CreateUnitDto,
  UpdateUnitDto,
  CreateApartmentDto,
  UpdateApartmentDto,
  CreateApartmentOwnershipDto,
  UpdateApartmentOwnershipDto,
} from "./types";

// ─── Generic fetch hook ───────────────────────────────────────────────────────

function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError((err as Error).message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

// ─── Shareholders ─────────────────────────────────────────────────────────────

export function useShareholders() {
  const { data, loading, error, reload } = useFetch(() => api.shareholders.list());
  const shareholders = data ?? [];

  async function create(dto: CreateShareholderDto) {
    const result = await api.shareholders.create(dto);
    await reload();
    return result;
  }
  async function update(id: number, dto: UpdateShareholderDto) {
    const result = await api.shareholders.update(id, dto);
    await reload();
    return result;
  }
  async function remove(id: number) {
    await api.shareholders.delete(id);
    await reload();
  }

  return { shareholders, loading, error, reload, create, update, remove };
}

export function useShareholder(id: number | null) {
  const fetcher = useCallback(
    () => (id !== null ? api.shareholders.get(id) : Promise.resolve(null)),
    [id]
  );
  return useFetch(fetcher, [id]);
}

// ─── Units ────────────────────────────────────────────────────────────────────

export function useUnits() {
  const { data, loading, error, reload } = useFetch(() => api.units.list());
  const units = data ?? [];

  async function create(dto: CreateUnitDto) {
    const result = await api.units.create(dto);
    await reload();
    return result;
  }
  async function update(id: number, dto: UpdateUnitDto) {
    const result = await api.units.update(id, dto);
    await reload();
    return result;
  }
  async function remove(id: number) {
    await api.units.delete(id);
    await reload();
  }

  return { units, loading, error, reload, create, update, remove };
}

export function useUnit(id: number | null) {
  const fetcher = useCallback(
    () => (id !== null ? api.units.get(id) : Promise.resolve(null)),
    [id]
  );
  return useFetch(fetcher, [id]);
}

// ─── Apartments ───────────────────────────────────────────────────────────────

export function useApartments() {
  const { data, loading, error, reload } = useFetch(() => api.apartments.list());
  const apartments = data ?? [];

  async function create(dto: CreateApartmentDto) {
    const result = await api.apartments.create(dto);
    await reload();
    return result;
  }
  async function update(id: number, dto: UpdateApartmentDto) {
    const result = await api.apartments.update(id, dto);
    await reload();
    return result;
  }
  async function remove(id: number) {
    await api.apartments.delete(id);
    await reload();
  }

  return { apartments, loading, error, reload, create, update, remove };
}

export function useApartmentsByUnit(unitId: number | null) {
  const fetcher = useCallback(
    () => (unitId !== null ? api.apartments.byUnit(unitId) : Promise.resolve([])),
    [unitId]
  );
  const { data, loading, error, reload } = useFetch(fetcher, [unitId]);
  return { apartments: data ?? [], loading, error, reload };
}

// ─── Ownerships ───────────────────────────────────────────────────────────────

export function useOwnerships() {
  const { data, loading, error, reload } = useFetch(() => api.ownerships.list());
  const ownerships = data ?? [];

  async function create(dto: CreateApartmentOwnershipDto) {
    const result = await api.ownerships.create(dto);
    await reload();
    return result;
  }
  async function update(id: number, dto: UpdateApartmentOwnershipDto) {
    const result = await api.ownerships.update(id, dto);
    await reload();
    return result;
  }
  async function remove(id: number) {
    await api.ownerships.delete(id);
    await reload();
  }

  return { ownerships, loading, error, reload, create, update, remove };
}

export function useOwnershipsByShareholder(shareholderId: number | null) {
  const fetcher = useCallback(
    () =>
      shareholderId !== null
        ? api.ownerships.byShareholder(shareholderId)
        : Promise.resolve([]),
    [shareholderId]
  );
  const { data, loading, error, reload } = useFetch(fetcher, [shareholderId]);
  return { ownerships: data ?? [], loading, error, reload };
}

export function useOwnershipsByApartment(apartmentId: number | null) {
  const fetcher = useCallback(
    () =>
      apartmentId !== null
        ? api.ownerships.byApartment(apartmentId)
        : Promise.resolve([]),
    [apartmentId]
  );
  const { data, loading, error, reload } = useFetch(fetcher, [apartmentId]);
  return { ownerships: data ?? [], loading, error, reload };
}

// ─── Combined dashboard hook ──────────────────────────────────────────────────

export function useDashboardData() {
  const [shareholders, setShareholders] = useState<ShareholderDto[]>([]);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [apartments, setApartments] = useState<ApartmentDto[]>([]);
  const [ownerships, setOwnerships] = useState<ApartmentOwnershipDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, u, a, o] = await Promise.all([
        api.shareholders.list(),
        api.units.list(),
        api.apartments.list(),
        api.ownerships.list(),
      ]);
      setShareholders(s);
      setUnits(u);
      setApartments(a);
      setOwnerships(o);
    } catch (err) {
      setError((err as Error).message ?? "حدث خطأ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { shareholders, units, apartments, ownerships, loading, error, reload: load };
}
