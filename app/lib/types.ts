// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ApartmentStatus {
  Available = 0,
  Sold = 1,
  Rented = 2,
  UnderMaintenance = 3,
}

export const ApartmentStatusLabels: Record<ApartmentStatus, string> = {
  [ApartmentStatus.Available]: "متاح",
  [ApartmentStatus.Sold]: "مباع",
  [ApartmentStatus.Rented]: "مؤجر",
  [ApartmentStatus.UnderMaintenance]: "تحت الصيانة",
};

export const ApartmentStatusColors: Record<ApartmentStatus, string> = {
  [ApartmentStatus.Available]: "bg-emerald-100 text-emerald-700",
  [ApartmentStatus.Sold]: "bg-blue-100 text-blue-700",
  [ApartmentStatus.Rented]: "bg-amber-100 text-amber-700",
  [ApartmentStatus.UnderMaintenance]: "bg-red-100 text-red-700",
};

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface ShareholderDto {
  id: number;
  fullName: string | null;
  nationalId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
  isActive: boolean;
  identityUserId?: string | null;
  generatedPassword?: string | null;
}

export interface CreateShareholderDto {
  fullName?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface UpdateShareholderDto {
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface UnitDto {
  id: number;
  code: string | null;
  name: string | null;
  description: string | null;
  totalApartments: number;
  numFloors: number;
  numApartmentsFloor: number | null;
  address: string | null;
}

export interface CreateUnitDto {
  code?: string | null;
  name?: string | null;
  description?: string | null;
  totalApartments?: number;
  numFloors?: number;
  numApartmentsFloor?: number | null;
  address?: string | null;
}

export interface UpdateUnitDto {
  name?: string | null;
  description?: string | null;
  totalApartments?: number | null;
  numFloors?: number | null;
  numApartmentsFloor?: number | null;
  address?: string | null;
}

export interface ApartmentDto {
  id: number;
  apartmentNumber: string | null;
  floor: string | null;
  unitId: number;
  unitName: string | null;
  status: ApartmentStatus;
  statusName: string | null;
}

export interface CreateApartmentDto {
  apartmentNumber?: string | null;
  floor?: string | null;
  unitId?: number;
  status?: ApartmentStatus;
}

export interface UpdateApartmentDto {
  apartmentNumber?: string | null;
  floor?: string | null;
  status?: ApartmentStatus;
}

export interface ApartmentOwnershipDto {
  id: number;
  apartmentId: number;
  apartmentNumber: string | null;
  shareholderId: number;
  shareholderName: string | null;
  ownershipPercentage: number;
}

export interface CreateApartmentOwnershipDto {
  apartmentId?: number;
  shareholderId?: number;
  ownershipPercentage?: number;
}

export interface UpdateApartmentOwnershipDto {
  ownershipPercentage?: number;
}

// ─── Auth (local, no backend auth yet) ──────────────────────────────────────

export type UserRole = "admin" | "shareholder";

export interface AuthUser {
  id: number;
  name: string;
  role: UserRole;
  shareholderId?: number;
  token?: string;          // JWT from API
  email?: string;
}

// ─── Login DTOs ───────────────────────────────────────────────────────────────

export interface LoginDto {
  userName: string;
  password: string;
}

export interface LoginResponseDto {
  token:           string | null;
  userName:        string | null;
  email:           string | null;
  shareholderName: string | null;
  shareholderId:   number | null;
}
