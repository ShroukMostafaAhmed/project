// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ApartmentStatus {
  Available        = 0,
  Sold             = 1,
  Rented           = 2,
  UnderMaintenance = 3,
}

export const ApartmentStatusLabels: Record<ApartmentStatus, string> = {
  [ApartmentStatus.Available]:        "متاح",
  [ApartmentStatus.Sold]:             "مكتمل",
  [ApartmentStatus.Rented]:           "مؤجر",
  [ApartmentStatus.UnderMaintenance]: "تحت الصيانة",
};

export const ApartmentStatusColors: Record<ApartmentStatus, string> = {
  [ApartmentStatus.Available]:        "bg-emerald-100 text-emerald-700",
  [ApartmentStatus.Sold]:             "bg-blue-100 text-blue-700",
  [ApartmentStatus.Rented]:           "bg-amber-100 text-amber-700",
  [ApartmentStatus.UnderMaintenance]: "bg-red-100 text-red-700",
};

// ─── Ownership completion helpers ────────────────────────────────────────────

/** Returns a badge-like descriptor based on total ownership percentage of an apartment */
export function ownershipBadge(totalPct: number): {
  label: string;
  sub:   string;
  color: string;
  bg:    string;
  dot:   string;
} {
  if (totalPct >= 100) {
    return {
      label: "مكتمل",
      sub:   "100%",
      color: "text-emerald-700",
      bg:    "bg-emerald-50 border-emerald-200",
      dot:   "bg-emerald-500",
    };
  }
  const remaining = (100 - totalPct).toFixed(1);
  return {
    label: "غير مكتمل",
    sub:   `${totalPct.toFixed(1)}% مسجّل · متبقي ${remaining}%`,
    color: "text-amber-700",
    bg:    "bg-amber-50 border-amber-200",
    dot:   "bg-amber-400",
  };
}

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
  password?:string | null;
  
}

export interface CreateShareholderDto {
  fullName?: string | null;
  nationalId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  password?: string | null;
}

export interface UpdateShareholderDto {
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
  password?: string | null;
}

export interface UnitDto {
  id:                    number;
  code:                  string | null;
  name:                  string | null;
  description:           string | null;
  totalApartments:       number;
  numFloors:             number;
  numApartmentsFloor:    number | null;
  address:               string | null;
  // Financial & share fields (returned by API)
  numOfShareholders?:    number | null;
  numOfShares?:          number | null;
  stockRatio?:           number | null;
  landSharePrice?:       number | null;
  purchasePrice?:        number | null;
  commission?:           number | null;
  legalContractCosts?:   number | null;
  realEstateRegExpenses?:number | null;
  demolitionPermit?:     number | null;
  buildingPermit?:       number | null;
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

// ─── ShareholderUnit (list / by-unit) ────────────────────────────────────────

export interface ShareholderUnitDto {
  id:              number;
  shareholderId:   number;
  shareholderName: string | null;
  unitId:          number;
  unitName:        string | null;
  sharesCount:     number;
}

// ─── ShareholderUnit full response (by-shareholder) ─────────────────────────

export interface ShareholderUnitApartment {
  apartmentId:         number;
  apartmentNumber:     string | null;
  floor:               string | null;
  ownershipPercentage: number;
}

export interface ShareholderUnitEntry {
  unitId:                    number;
  unitName:                  string | null;
  unitCode:                  string | null;
  sharesCount:               number;
  sharePercentage:           number;
  remainingSharePercentage?: number;  
  apartments:                ShareholderUnitApartment[];
}

export interface ShareholderFullDto {
  shareholderId:   number;
  shareholderName: string | null;
  nationalId:      string | null;
  units:           ShareholderUnitEntry[];
}

export interface CreateShareholderUnitDto {
  shareholderId: number;
  unitId:        number;
  sharesCount:   number;
}

export interface UpdateShareholderUnitDto {
  sharesCount: number;
}

// ─── UpdateUnitDto (extended with financial fields) ───────────────────────────

export interface UpdateUnitDto {
  name?:                  string | null;
  description?:           string | null;
  totalApartments?:       number | null;
  numFloors?:             number | null;
  numApartmentsFloor?:    number | null;
  address?:               string | null;
  // Financial fields
  purchasePrice?:         number | null;
  commission?:            number | null;
  legalContractCosts?:    number | null;
  realEstateRegExpenses?: number | null;
  demolitionPermit?:      number | null;
  buildingPermit?:        number | null;
  numOfShareholders?:     number | null;
  numOfShares?:           number | null;
  landSharePrice?:        number | null;
  stockRatio?:            number | null;
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

export interface AvailableApartmentDto {
  apartmentId:                           number;
  apartmentNumber:                       string | null;
  floor:                                 string | null;
  unitId:                                number;
  unitName?:                             string | null;
  unitCode?:                             string | null;
  status:                                ApartmentStatus;
  statusName?:                           string | null;
  totalOwnershipPercentage:              number;   // مجموع النسب المسجلة
  remainingOwnershipPercentage:          number;   // الباقي المتاح
  currentShareholderOwnershipPercentage: number;   // نسبة المساهم الحالي
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

// ─── Financial ────────────────────────────────────────────────────────────────

export enum TransactionType {
  Expense = 2,
  Revenue = 1,
}

export enum PaymentMethod {
  Cash    = 1,
  Bank    = 2,
  Cheque  = 3,
}

export const TransactionTypeLabels: Record<TransactionType, string> = {
  [TransactionType.Expense]: "مصروف",
  [TransactionType.Revenue]: "إيراد",
};

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]:   "نقدي",
  [PaymentMethod.Bank]:   "تحويل بنكي",
  [PaymentMethod.Cheque]: "شيك",
};

export interface FinancialCategoryDto {
  id:          number;
  name:        string;
  type:        TransactionType;
  description: string | null;
}

export interface CreateFinancialCategoryDto {
  name:         string;
  type:         TransactionType;
  description?: string | null;
}

export interface UpdateFinancialCategoryDto {
  name?:        string;
  type?:        TransactionType;
  description?: string | null;
  
}

export interface FinancialTransactionDto {
  id:                    number;
  categoryId:            number;
  categoryName?:         string | null;
  type?:                 TransactionType;
  transactionType?:      TransactionType;
  amount:                number;
  description?:          string | null;
  date?:                 string | null;
  transactionDate?:      string | null;
  notes?:                string | null;
  auditNo?:              number | null;
  auditNu?:              number | null;
  paymentMethod?:        PaymentMethod | null;
  paidToOrReceivedFrom?: string | null;
  referenceNumber?:      string | null;
  unitId?:               number | null;
  unitName?:             string | null;
}

export interface CreateFinancialTransactionDto {
  categoryId:             number;
  transactionType:        TransactionType;   // اسم الحقل الصح في الـ API
  type?:                  TransactionType;   // fallback للتوافق
  amount:                 number;
  description?:           string | null;
  transactionDate:        string;            // اسم الحقل الصح في الـ API
  date?:                  string;            // fallback للتوافق
  notes?:                 string | null;
  auditNo?:               number | null;
  paymentMethod?:         PaymentMethod | null;
  paidToOrReceivedFrom?:  string | null;
  referenceNumber?:       string | null;
  unitId?:                number | null;
}

export interface UpdateFinancialTransactionDto {
  categoryId?:            number;
  amount?:                number;
  description?:           string | null;
  date?:                  string;
  notes?:                 string | null;
  paymentMethod?:         PaymentMethod | null;
  paidToOrReceivedFrom?:  string | null;
  referenceNumber?:       string | null;
}

export interface FinancialSummaryDto {
  totalRevenues?:          number;    // اسم الـ API الفعلي
  totalRevenue?:           number;    // fallback (اسم قديم)
  totalExpenses:           number;
  netBalance?:             number;    // اسم الـ API الفعلي
  netProfit?:              number;    // fallback (اسم قديم)
  auditNo?:                number | null;
  totalTransactionsCount?: number;
}

export interface ShareholderContractDto {
  id:             number;
  shareholderId:  number;
  shareholderName?: string | null;
  unitId?:        number | null;
  unitName?:      string | null;
  folderName?:    string | null;
  fileName:       string | null;
  fileUrl?:       string | null;
  uploadedAt?:    string | null;
  description?:   string | null;
  contractType?:  string | null;
}

export interface UpdateContractDto {
  description?:  string | null;
  contractType?: string | null;
}

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

// ─── Financial Audit (جرد) ────────────────────────────────────────────────────

export interface FinancialAuditDto {
  id:               number;
  name:             string;
  fromDate:         string;
  toDate:           string;
  openingBalance:   number;
  totalRevenue:     number;
  totalExpenses:    number;
  netResult:        number;
  closingBalance:   number;
  previousAuditId:  number | null;
  createdAt:        string;
}

export type CreateFinancialAuditDto = Omit<FinancialAuditDto, "id" | "createdAt">;


export enum FinanceType {
  Expense = 1,
  Payment = 2,
}

export const FinanceTypeLabels: Record<FinanceType, string> = {
  [FinanceType.Expense]: "مديونية",
  [FinanceType.Payment]: "دفعة",
};

export interface FinanceDto {
  id:              number;
  date:            string;
  description:     string | null;
  amount:          number;
  type:            FinanceType;
  typeName?:       string | null;
  unitId:          number;
  unitName?:       string | null;
  unitCode?:       string | null;
  shareholderId?:  number | null;
  shareholderName?:string | null;
  notes?:          string | null;
  auditId?:        number | null;  // الجرد المرتبط
  createdAt:       string;
}

export interface CreateFinanceDto {
  date:           string;
  description?:   string | null;
  amount:         number;
  type:           FinanceType;
  unitId:         number;
  shareholderId?: number | null;
  notes?:         string | null;
  auditId?:       number | null;   // الجرد اللي بيتسدد فيه (للدفعات)
}

export interface UpdateFinanceDto {
  date?:          string;
  description?:   string | null;
  amount?:        number;
  type?:          FinanceType;
  unitId?:        number;
  shareholderId?: number | null;
  notes?:         string | null;
}

/** GET /api/Finances/summary/unit/{unitId} */
export interface ProjectFinanceSummaryDto {
  unitId:                number;
  unitName?:             string | null;
  unitCode?:             string | null;
  totalBaseCosts:        number;
  totalProjectExpenses:  number;
  totalCost:             number;   // readOnly = baseCosts + projectExpenses
  totalPaymentsReceived: number;
  remainingBalance:      number;   // readOnly = totalCost - totalPaymentsReceived
}

/** GET /api/Finances/shareholders-report */
export interface ShareholderUnitFinanceDetailDto {
  unitId:               number;
  unitName?:            string | null;
  unitCode?:            string | null;
  sharesCount:          number;
  totalShares:          number;
  sharePercentage:      number;
  unitBaseCosts:        number;
  unitProjectExpenses:  number;
  totalUnitCost:        number;   // readOnly
  owedAmount:           number;
  paidAmount:           number;
  debtAmount:           number;   // readOnly = owedAmount - paidAmount
}

export interface ShareholderFinanceReportDto {
  shareholderId:    number;
  shareholderName?: string | null;
  nationalId?:      string | null;
  units?:           ShareholderUnitFinanceDetailDto[] | null;
  totalOwedAmount:  number;   // readOnly
  totalPaidAmount:  number;   // readOnly
  totalDebtAmount:  number;   // readOnly
}


export enum UnitAuditStatus {
  Pending = 0,
  Closed  = 1,
}

export interface UnitAuditShareholderShare {
  shareholderId:   number;
  shareholderName: string | null;
  sharePercentage: number;          
  shareAmount:     number;          
}

export interface UnitAuditDto {
  id:                   number;
  unitId:               number;
  unitName?:            string | null;
  name:                 string;
  fromDate:             string;
  toDate:               string;
  status:               UnitAuditStatus;  // Pending=0, Closed=1
  totalExpenses:        number;      // حي لو Pending، نهائي لو Closed
  shareholderShares:    UnitAuditShareholderShare[];
  previousUnitAuditId?: number | null;
  closedAt?:            string | null;
  createdAt:            string;
}

/** POST /api/Units/{unitId}/audits — إنشاء جرد جديد (فترة بس، بدون حساب) */
export interface CreateUnitAuditDto {
  name:                 string;
  fromDate:             string;
  toDate:               string;
  previousUnitAuditId?: number | null;
}

/** GET /api/Units/{unitId}/audits/current-expenses — معاينة حية للجرد الـ Pending */
export interface UnitExpenseSummaryDto {
  unitId:        number;
  fromDate:      string;
  toDate:        string;
  totalExpenses: number;
  shareholderBreakdown: {
    shareholderId:    number;
    shareholderName:  string | null;
    sharePercentage:  number;
    shareAmount:      number;
  }[];
}

// ─── Apartment Sales (مبيعات الشقق) ─────────────────────────────────────────

export interface ApartmentSaleInstallmentDto {
  id:                number;
  apartmentSaleId:   number;
  installmentNumber: number;
  dueDate:           string;
  amount:            number;
  isPaid:            boolean;
  paidDate?:         string | null;
  notes?:            string | null;
}

export interface ShareholderPayoutShareDto {
  shareholderId:       number;
  shareholderName?:    string | null;
  ownershipPercentage: number;
  shareAmount:         number;
}

export interface ApartmentSaleDto {
  id:                        number;
  apartmentId:               number;
  apartmentNumber?:          string | null;
  floor?:                    string | null;
  unitId:                    number;
  unitName?:                 string | null;
  buyerName?:                string | null;
  buyerPhone?:               string | null;
  buyerNationalId?:          string | null;
  totalPrice:                number;
  downPayment:               number;
  installmentMonthsCount:    number;
  monthlyInstallmentAmount:  number;
  saleDate:                  string;
  firstInstallmentDueDate:   string;
  notes?:                    string | null;
  shareholdersPayoutBreakdown?: ShareholderPayoutShareDto[] | null;
  installments?:             ApartmentSaleInstallmentDto[] | null;
}

export interface CreateApartmentSaleDto {
  apartmentId:             number;
  buyerName?:              string | null;
  buyerPhone?:             string | null;
  buyerNationalId?:        string | null;
  totalPrice:              number;
  downPayment:             number;
  installmentMonthsCount:  number;
  saleDate?:               string | null;
  firstInstallmentDueDate?: string | null;
  notes?:                  string | null;
}

export interface PayInstallmentDto {
  paidDate?: string | null;
  notes?:    string | null;
}
