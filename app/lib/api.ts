import {
  ShareholderDto, CreateShareholderDto, UpdateShareholderDto,
  UnitDto, CreateUnitDto, UpdateUnitDto,
  ApartmentDto, CreateApartmentDto, UpdateApartmentDto,
  ApartmentOwnershipDto, CreateApartmentOwnershipDto, UpdateApartmentOwnershipDto,
  ShareholderUnitDto, CreateShareholderUnitDto, UpdateShareholderUnitDto,
  ShareholderFullDto,
  ShareholderContractDto, UpdateContractDto,
  FinancialCategoryDto, CreateFinancialCategoryDto, UpdateFinancialCategoryDto,
  FinancialTransactionDto, CreateFinancialTransactionDto, UpdateFinancialTransactionDto,
  FinancialSummaryDto, TransactionType,
  FinancialAuditDto, CreateFinancialAuditDto,
  LoginDto, LoginResponseDto,
} from "./types";
import {
  MOCK_SHAREHOLDERS, MOCK_UNITS, MOCK_APARTMENTS, MOCK_OWNERSHIPS,
} from "./mock-data";

const BASE_URL = typeof window === "undefined"
  ? "https://contributorapi.runasp.net"
  : "/api-proxy";

// ─── Small delay ──────────────────────────────────────────────────────────────
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// ─── Get stored JWT ───────────────────────────────────────────────────────────
function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return {};
    const user = JSON.parse(raw);
    if (user?.token) return { Authorization: `Bearer ${user.token}` };
  } catch { /* ignore */ }
  return {};
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text || path}`);
  }
  // Handle empty responses (204 No Content or empty body)
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text || text.trim() === "") return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined as T;
  }
}

// ─── Fallback wrapper ─────────────────────────────────────────────────────────
// Only falls back to mock on genuine network failures (CORS, offline, etc.)
// Real API errors (4xx, 5xx) are thrown as-is
async function withFallback<T>(realFn: () => Promise<T>, mockFn: () => T): Promise<T> {
  try {
    return await realFn();
  } catch (err) {
    const msg = (err as Error).message ?? "";
    // Only fall back if it's a true network/fetch error, not an API error
    const isNetworkError = msg.includes("fetch") || msg.includes("NetworkError") || msg.includes("Failed to fetch");
    if (isNetworkError) {
      console.warn("[API] Network error, using mock data:", msg);
      await delay(150);
      return mockFn();
    }
    // Re-throw API errors (401, 404, 500, etc.)
    throw err;
  }
}

// ─── Always-fallback wrapper (for endpoints not yet on server) ────────────────
async function withAlwaysFallback<T>(realFn: () => Promise<T>, mockFn: () => T): Promise<T> {
  try {
    return await realFn();
  } catch (err) {
    console.warn("[API] Using mock data:", (err as Error).message);
    await delay(150);
    return mockFn();
  }
}
let _shareholders = [...MOCK_SHAREHOLDERS];
let _units        = [...MOCK_UNITS];
let _apartments   = [...MOCK_APARTMENTS];
let _ownerships   = [...MOCK_OWNERSHIPS];
let _shareholderUnits: ShareholderUnitDto[] = [];
let _nextId       = 100;

// ─── Mock audits (in-memory) ──────────────────────────────────────────────────
let MOCK_AUDITS: FinancialAuditDto[] = [
  {
    id: 1, name: "جرد 1",
    fromDate: "2026-06-01", toDate: "2026-06-30",
    openingBalance: 0,
    totalRevenue: 1_064_000, totalExpenses: 289_121,
    netResult: 774_879, closingBalance: 774_879,
    previousAuditId: null, createdAt: "2026-07-01T10:00:00Z",
  },
  {
    id: 2, name: "جرد 2",
    fromDate: "2026-07-01", toDate: "2026-07-31",
    openingBalance: 774_879,
    totalRevenue: 55_000, totalExpenses: 18_500,
    netResult: 36_500, closingBalance: 811_379,
    previousAuditId: 1, createdAt: "2026-08-01T10:00:00Z",
  },
  {
    id: 3, name: "جرد 3",
    fromDate: "2026-08-01", toDate: "2026-08-31",
    openingBalance: 811_379,
    totalRevenue: 120_000, totalExpenses: 95_000,
    netResult: 25_000, closingBalance: 836_379,
    previousAuditId: 2, createdAt: "2026-09-01T10:00:00Z",
  },
];

export const api = {

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    login: (data: LoginDto) =>
      request<LoginResponseDto>("/Auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // ─── Shareholders ──────────────────────────────────────────────────────────
  shareholders: {
    list: () => withFallback(
      () =>request<ShareholderDto[]>("/Shareholders"),
      () => [..._shareholders]
    ),
    get: (id: number) => withFallback(
      () => request<ShareholderDto>(`/Shareholders/${id}`),
      () => {
        const s = _shareholders.find((x) => x.id === id);
        if (!s) throw new Error("Not found");
        return s;
      }
    ),
    create: (data: CreateShareholderDto) => withFallback(
      () => request<ShareholderDto>("/Shareholders", { method: "POST", body: JSON.stringify(data) }),
      () => {
        const s: ShareholderDto = {
          id: _nextId++,
          fullName:   data.fullName   ?? null,
          nationalId: data.nationalId ?? null,
          phone:      data.phone      ?? null,
          email:      data.email      ?? null,
          address:    data.address    ?? null,
          createdAt:  new Date().toISOString(),
          isActive:   true,
        };
        _shareholders = [..._shareholders, s];
        return s;
      }
    ),
    update: (id: number, data: UpdateShareholderDto) => withFallback(
      () => request<ShareholderDto>(`/Shareholders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      () => {
        _shareholders = _shareholders.map((s) => s.id === id ? { ...s, ...data } : s);
        return _shareholders.find((s) => s.id === id)!;
      }
    ),
    delete: (id: number) => withFallback(
      () => request<void>(`/Shareholders/${id}`, { method: "DELETE" }),
      () => { _shareholders = _shareholders.filter((s) => s.id !== id); }
    ),
  },

  // ─── Units ─────────────────────────────────────────────────────────────────
  units: {
    list: () => withFallback(
      () => request<UnitDto[]>("/Units"),
      () => [..._units]
    ),
    get: (id: number) => withFallback(
      () => request<UnitDto>(`/Units/${id}`),
      () => {
        const u = _units.find((x) => x.id === id);
        if (!u) throw new Error("Not found");
        return u;
      }
    ),
    create: (data: CreateUnitDto) => withFallback(
      () => request<UnitDto>("/Units", { method: "POST", body: JSON.stringify(data) }),
      () => {
        const u: UnitDto = {
          id: _nextId++,
          code:               data.code               ?? null,
          name:               data.name               ?? null,
          description:        data.description        ?? null,
          totalApartments:    data.totalApartments    ?? 0,
          numFloors:          data.numFloors          ?? 0,
          numApartmentsFloor: data.numApartmentsFloor ?? null,
          address:            data.address            ?? null,
        };
        _units = [..._units, u];
        return u;
      }
    ),
    update: (id: number, data: UpdateUnitDto) => withFallback(
      () => request<UnitDto>(`/Units/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      () => {
        _units = _units.map((u) => u.id === id ? {
          ...u,
          name:               data.name               ?? u.name,
          description:        data.description        ?? u.description,
          totalApartments:    data.totalApartments    ?? u.totalApartments,
          numFloors:          data.numFloors          ?? u.numFloors,
          numApartmentsFloor: data.numApartmentsFloor ?? u.numApartmentsFloor,
          address:            data.address            ?? u.address,
        } : u);
        return _units.find((u) => u.id === id)!;
      }
    ),
    delete: (id: number) => withFallback(
      () => request<void>(`/Units/${id}`, { method: "DELETE" }),
      () => { _units = _units.filter((u) => u.id !== id); }
    ),
  },

  // ─── Apartments ────────────────────────────────────────────────────────────
  apartments: {
    list: () => withFallback(
      () => request<ApartmentDto[]>("/Apartments"),
      () => [..._apartments]
    ),
    get: (id: number) => withFallback(
      () => request<ApartmentDto>(`/Apartments/${id}`),
      () => {
        const a = _apartments.find((x) => x.id === id);
        if (!a) throw new Error("Not found");
        return a;
      }
    ),
    byUnit: (unitId: number) => withFallback(
      () => request<ApartmentDto[]>(`/Apartments/by-unit/${unitId}`),
      () => _apartments.filter((a) => a.unitId === unitId)
    ),
    create: (data: CreateApartmentDto) => withFallback(
      () => request<ApartmentDto>("/Apartments", { method: "POST", body: JSON.stringify(data) }),
      () => {
        const unit = _units.find((u) => u.id === data.unitId);
        const a: ApartmentDto = {
          id:              _nextId++,
          apartmentNumber: data.apartmentNumber ?? null,
          floor:           data.floor           ?? null,
          unitId:          data.unitId          ?? 0,
          unitName:        unit?.name           ?? null,
          status:          data.status          ?? 0,
          statusName:      null,
        };
        _apartments = [..._apartments, a];
        return a;
      }
    ),
    update: (id: number, data: UpdateApartmentDto) => withFallback(
      () => request<ApartmentDto>(`/Apartments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      () => {
        _apartments = _apartments.map((a) => a.id === id ? { ...a, ...data } : a);
        return _apartments.find((a) => a.id === id)!;
      }
    ),
    delete: (id: number) => withFallback(
      () => request<void>(`/Apartments/${id}`, { method: "DELETE" }),
      () => { _apartments = _apartments.filter((a) => a.id !== id); }
    ),
  },

  // ─── Ownerships ────────────────────────────────────────────────────────────
  ownerships: {
    list: () => withFallback(
      () => request<ApartmentOwnershipDto[]>("/ApartmentOwnerships"),
      () => [..._ownerships]
    ),
    get: (id: number) => withFallback(
      () => request<ApartmentOwnershipDto>(`/ApartmentOwnerships/${id}`),
      () => {
        const o = _ownerships.find((x) => x.id === id);
        if (!o) throw new Error("Not found");
        return o;
      }
    ),
    byApartment: (apartmentId: number) => withFallback(
      () => request<ApartmentOwnershipDto[]>(`/ApartmentOwnerships/by-apartment/${apartmentId}`),
      () => _ownerships.filter((o) => o.apartmentId === apartmentId)
    ),
    byShareholder: (shareholderId: number) => withFallback(
      () => request<ApartmentOwnershipDto[]>(`/ApartmentOwnerships/by-shareholder/${shareholderId}`),
      () => _ownerships.filter((o) => o.shareholderId === shareholderId)
    ),
    create: (data: CreateApartmentOwnershipDto) => withFallback(
      () => request<ApartmentOwnershipDto>("/ApartmentOwnerships", { method: "POST", body: JSON.stringify(data) }),
      () => {
        const apt = _apartments.find((a) => a.id === data.apartmentId);
        const sh  = _shareholders.find((s) => s.id === data.shareholderId);
        const o: ApartmentOwnershipDto = {
          id:                  _nextId++,
          apartmentId:         data.apartmentId         ?? 0,
          apartmentNumber:     apt?.apartmentNumber     ?? null,
          shareholderId:       data.shareholderId       ?? 0,
          shareholderName:     sh?.fullName             ?? null,
          ownershipPercentage: data.ownershipPercentage ?? 0,
        };
        _ownerships = [..._ownerships, o];
        return o;
      }
    ),
    update: (id: number, data: UpdateApartmentOwnershipDto) => withFallback(
      () => request<ApartmentOwnershipDto>(`/ApartmentOwnerships/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      () => {
        _ownerships = _ownerships.map((o) => o.id === id ? { ...o, ...data } : o);
        return _ownerships.find((o) => o.id === id)!;
      }
    ),
    delete: (id: number) => withFallback(
      () => request<void>(`/ApartmentOwnerships/${id}`, { method: "DELETE" }),
      () => { _ownerships = _ownerships.filter((o) => o.id !== id); }
    ),
  },

  // ─── ShareholderUnits ──────────────────────────────────────────────────────
  shareholderUnits: {
    list: () => withFallback(
      () => request<ShareholderUnitDto[]>("/ShareholderUnits"),
      () => [..._shareholderUnits]
    ),
    get: (id: number) => withFallback(
      () => request<ShareholderUnitDto>(`/ShareholderUnits/${id}`),
      () => {
        const s = _shareholderUnits.find(x => x.id === id);
        if (!s) throw new Error("Not found");
        return s;
      }
    ),
    byUnit: (unitId: number) => withFallback(
      () => request<ShareholderUnitDto[]>(`/ShareholderUnits/by-unit/${unitId}`),
      () => _shareholderUnits.filter(s => s.unitId === unitId)
    ),
    byShareholder: (shareholderId: number) => withFallback(
      () => request<ShareholderFullDto>(`/ShareholderUnits/by-shareholder/${shareholderId}`),
      () => ({
        shareholderId,
        shareholderName: null,
        nationalId: null,
        units: _shareholderUnits
          .filter(s => s.shareholderId === shareholderId)
          .map(s => ({
            unitId: s.unitId, unitName: s.unitName, unitCode: null,
            sharesCount: s.sharesCount, sharePercentage: 0, apartments: [],
          })),
      })
    ),
    create: (data: CreateShareholderUnitDto) => withFallback(
      () => request<ShareholderUnitDto>("/ShareholderUnits", { method: "POST", body: JSON.stringify(data) }),
      () => {
        const sh   = _shareholders.find(s => s.id === data.shareholderId);
        const unit = _units.find(u => u.id === data.unitId);
        const entry: ShareholderUnitDto = {
          id: _nextId++,
          shareholderId: data.shareholderId,
          unitId: data.unitId,
          shareholderName: sh?.fullName ?? null,
          unitName: unit?.name ?? null,
          sharesCount: data.sharesCount,
        };
        _shareholderUnits = [..._shareholderUnits, entry];
        return entry;
      }
    ),
    update: (id: number, data: UpdateShareholderUnitDto) => withFallback(
      () => request<ShareholderUnitDto>(`/ShareholderUnits/${id}`, { method: "PUT", body: JSON.stringify(data) }),
      () => {
        _shareholderUnits = _shareholderUnits.map(s =>
          s.id === id ? { ...s, sharesCount: data.sharesCount } : s
        );
        return _shareholderUnits.find(s => s.id === id)!;
      }
    ),
    delete: (id: number) => withFallback(
      () => request<void>(`/ShareholderUnits/${id}`, { method: "DELETE" }),
      () => { _shareholderUnits = _shareholderUnits.filter(s => s.id !== id); }
    ),
  },

  // ─── FinancialCategories ──────────────────────────────────────────────────
  financialCategories: {
    list: (type?: TransactionType) => {
      const q = type !== undefined ? `?TransactionType=${type}` : "";
      return request<FinancialCategoryDto[]>(`/FinancialCategories${q}`);
    },
    get: (id: number) => request<FinancialCategoryDto>(`/FinancialCategories/${id}`),
    create: (data: CreateFinancialCategoryDto) =>
      request<FinancialCategoryDto>("/FinancialCategories", { method:"POST", body:JSON.stringify(data) }),
    update: (id: number, data: UpdateFinancialCategoryDto) =>
      request<FinancialCategoryDto>(`/FinancialCategories/${id}`, { method:"PUT", body:JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/FinancialCategories/${id}`, { method:"DELETE" }),
  },

  // ─── FinancialTransactions ────────────────────────────────────────────────
  financialTransactions: {
    list: (params?: {
      categoryId?: number; type?: TransactionType;
      fromDate?: string; toDate?: string; auditNo?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.categoryId !== undefined) q.set("categoryId", String(params.categoryId));
      if (params?.type        !== undefined) q.set("type",       String(params.type));
      if (params?.fromDate)                  q.set("fromDate",   params.fromDate);
      if (params?.toDate)                    q.set("toDate",     params.toDate);
      if (params?.auditNo     !== undefined) q.set("auditNo",    String(params.auditNo));
      const qs = q.toString();
      return request<FinancialTransactionDto[]>(`/FinancialTransactions${qs ? "?" + qs : ""}`);
    },
    get: (id: number) =>
      request<FinancialTransactionDto>(`/FinancialTransactions/${id}`),
    summary: (params?: { fromDate?: string; toDate?: string }) => {
      const q = new URLSearchParams();
      if (params?.fromDate) q.set("fromDate", params.fromDate);
      if (params?.toDate)   q.set("toDate",   params.toDate);
      const qs = q.toString();
      return request<FinancialSummaryDto>(`/FinancialTransactions/summary${qs ? "?" + qs : ""}`);
    },
    create: (data: CreateFinancialTransactionDto) =>
      request<FinancialTransactionDto>("/FinancialTransactions", { method:"POST", body:JSON.stringify(data) }),
    update: (id: number, data: UpdateFinancialTransactionDto) =>
      request<FinancialTransactionDto>(`/FinancialTransactions/${id}`, { method:"PUT", body:JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/FinancialTransactions/${id}`, { method:"DELETE" }),
  },

  // ─── FinancialAudits (الجرد) ─────────────────────────────────────────────
  financialAudits: {
    list: () => withAlwaysFallback(
      () => request<FinancialAuditDto[]>("/FinancialAudits"),
      () => [...MOCK_AUDITS]
    ),
    get: (id: number) => withAlwaysFallback(
      () => request<FinancialAuditDto>(`/FinancialAudits/${id}`),
      () => {
        const a = MOCK_AUDITS.find(x => x.id === id);
        if (!a) throw new Error("Not found");
        return a;
      }
    ),
    create: (data: CreateFinancialAuditDto) => withAlwaysFallback(
      () => request<FinancialAuditDto>("/FinancialAudits", { method:"POST", body:JSON.stringify(data) }),
      () => {
        const next: FinancialAuditDto = { ...data, id: Date.now(), createdAt: new Date().toISOString() };
        MOCK_AUDITS = [...MOCK_AUDITS, next];
        return next;
      }
    ),
    delete: (id: number) => withAlwaysFallback(
      () => request<void>(`/FinancialAudits/${id}`, { method:"DELETE" }),
      () => { MOCK_AUDITS = MOCK_AUDITS.filter(a => a.id !== id); }
    ),
  },
  // ─── ShareholderContracts ──────────────────────────────────────────────────
  contracts: {
    getAll: () =>
      request<ShareholderContractDto[]>("/ShareholderContracts/get-all-contracts"),

    getById: (id: number) =>
      request<ShareholderContractDto>(`/ShareholderContracts/get-contract/${id}`),

    byShareholder: (shareholderId: number) =>
      request<ShareholderContractDto[]>(
        `/ShareholderContracts/by-shareholder-contracts/${shareholderId}`
      ),

    upload: (shareholderId: number, file: File, description?: string, contractType?: string) => {
      const form = new FormData();
      form.append("file", file);
      form.append("shareholderId", String(shareholderId));
      if (description)  form.append("description", description);
      if (contractType) form.append("contractType", contractType);
      return fetch(`${BASE_URL}/ShareholderContracts/upload-contract`, {
        method: "POST",
        headers: { ...getAuthHeaders() },
        body: form,
      }).then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`${res.status}: ${txt}`);
        }
        const txt = await res.text();
        return txt ? JSON.parse(txt) as ShareholderContractDto : undefined;
      });
    },

    download: (id: number) =>
      fetch(`${BASE_URL}/ShareholderContracts/download/${id}`, {
        headers: getAuthHeaders(),
      }).then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.blob();
      }),

    update: (id: number, data: UpdateContractDto) =>
      request<ShareholderContractDto>(`/ShareholderContracts/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: number) =>
      request<void>(`/ShareholderContracts/delete/${id}`, { method: "DELETE" }),
  },
};