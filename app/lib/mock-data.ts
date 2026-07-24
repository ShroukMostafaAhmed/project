import {
  ShareholderDto,
  UnitDto,
  ApartmentDto,
  ApartmentOwnershipDto,
  ApartmentStatus,
} from "./types";

// ─── Shareholders ────────────────────────────────────────────────────────────
export const MOCK_SHAREHOLDERS: ShareholderDto[] = [
  { id: 1, fullName: "أحمد محمد علي",     nationalId: "29901011234567", phone: "01012345678", email: "ahmed@email.com",   address: "القاهرة، مدينة نصر",    createdAt: "2024-01-15T00:00:00Z", isActive: true  },
  { id: 2, fullName: "محمد خالد إبراهيم", nationalId: "29803052345678", phone: "01123456789", email: "mohamed@email.com", address: "الجيزة، المهندسين",     createdAt: "2024-02-20T00:00:00Z", isActive: true  },
  { id: 3, fullName: "سارة أحمد حسن",     nationalId: "30005153456789", phone: "01234567890", email: "sara@email.com",    address: "الإسكندرية، سموحة",     createdAt: "2024-03-10T00:00:00Z", isActive: true  },
  { id: 4, fullName: "خالد عمر مصطفى",    nationalId: "29707074567890", phone: "01098765432", email: "khaled@email.com",  address: "القاهرة، المعادي",       createdAt: "2024-04-05T00:00:00Z", isActive: true  },
  { id: 5, fullName: "منى إبراهيم يوسف",  nationalId: "29811225678901", phone: "01187654321", email: "mona@email.com",    address: "الجيزة، الشيخ زايد",    createdAt: "2024-05-12T00:00:00Z", isActive: false },
  { id: 6, fullName: "عمر سعيد فاروق",    nationalId: "29609036789012", phone: "01276543210", email: "omar@email.com",    address: "القاهرة، التجمع الخامس", createdAt: "2024-06-18T00:00:00Z", isActive: true  },
];

// ─── Units ───────────────────────────────────────────────────────────────────
export const MOCK_UNITS: UnitDto[] = [
  { id: 1, code: "A1", name: "برج الياسمين",   description: "برج سكني فاخر في قلب المدينة",  totalApartments: 24, numFloors: 8,  numApartmentsFloor: 3, address: "القاهرة، مدينة نصر، شارع عباس العقاد"    },
  { id: 2, code: "A2", name: "برج النيل",       description: "برج مطل على النيل بإطلالة رائعة", totalApartments: 30, numFloors: 10, numApartmentsFloor: 3, address: "الجيزة، الدقي، شارع النيل"                 },
  { id: 3, code: "B1", name: "كمبوند الأندلس",  description: "مجمع سكني متكامل بالخدمات",      totalApartments: 48, numFloors: 6,  numApartmentsFloor: 8, address: "القاهرة، التجمع الخامس، الحي الأول"       },
];

// ─── Apartments ──────────────────────────────────────────────────────────────
export const MOCK_APARTMENTS: ApartmentDto[] = [
  // A1 - برج الياسمين
  { id: 1,  apartmentNumber: "101", floor: "الأول",   unitId: 1, unitName: "برج الياسمين",  status: ApartmentStatus.Sold,             statusName: "مباع"           },
  { id: 2,  apartmentNumber: "102", floor: "الأول",   unitId: 1, unitName: "برج الياسمين",  status: ApartmentStatus.Rented,           statusName: "مؤجر"           },
  { id: 3,  apartmentNumber: "103", floor: "الأول",   unitId: 1, unitName: "برج الياسمين",  status: ApartmentStatus.Available,        statusName: "متاح"           },
  { id: 4,  apartmentNumber: "201", floor: "الثاني",  unitId: 1, unitName: "برج الياسمين",  status: ApartmentStatus.Sold,             statusName: "مباع"           },
  { id: 5,  apartmentNumber: "202", floor: "الثاني",  unitId: 1, unitName: "برج الياسمين",  status: ApartmentStatus.Available,        statusName: "متاح"           },
  { id: 6,  apartmentNumber: "301", floor: "الثالث",  unitId: 1, unitName: "برج الياسمين",  status: ApartmentStatus.UnderMaintenance, statusName: "تحت الصيانة"   },
  // A2 - برج النيل
  { id: 7,  apartmentNumber: "101", floor: "الأول",   unitId: 2, unitName: "برج النيل",     status: ApartmentStatus.Sold,             statusName: "مباع"           },
  { id: 8,  apartmentNumber: "201", floor: "الثاني",  unitId: 2, unitName: "برج النيل",     status: ApartmentStatus.Rented,           statusName: "مؤجر"           },
  { id: 9,  apartmentNumber: "202", floor: "الثاني",  unitId: 2, unitName: "برج النيل",     status: ApartmentStatus.Available,        statusName: "متاح"           },
  { id: 10, apartmentNumber: "301", floor: "الثالث",  unitId: 2, unitName: "برج النيل",     status: ApartmentStatus.Sold,             statusName: "مباع"           },
  // B1 - كمبوند الأندلس
  { id: 11, apartmentNumber: "A1",  floor: "الأرضي",  unitId: 3, unitName: "كمبوند الأندلس", status: ApartmentStatus.Rented,          statusName: "مؤجر"           },
  { id: 12, apartmentNumber: "A2",  floor: "الأرضي",  unitId: 3, unitName: "كمبوند الأندلس", status: ApartmentStatus.Available,       statusName: "متاح"           },
  { id: 13, apartmentNumber: "B1",  floor: "الأول",   unitId: 3, unitName: "كمبوند الأندلس", status: ApartmentStatus.Sold,            statusName: "مباع"           },
];

// ─── Ownerships ──────────────────────────────────────────────────────────────
export const MOCK_OWNERSHIPS: ApartmentOwnershipDto[] = [
  { id: 1,  apartmentId: 1,  apartmentNumber: "101", shareholderId: 1, shareholderName: "أحمد محمد علي",     ownershipPercentage: 60  },
  { id: 2,  apartmentId: 1,  apartmentNumber: "101", shareholderId: 2, shareholderName: "محمد خالد إبراهيم", ownershipPercentage: 40  },
  { id: 3,  apartmentId: 2,  apartmentNumber: "102", shareholderId: 1, shareholderName: "أحمد محمد علي",     ownershipPercentage: 100 },
  { id: 4,  apartmentId: 4,  apartmentNumber: "201", shareholderId: 3, shareholderName: "سارة أحمد حسن",     ownershipPercentage: 50  },
  { id: 5,  apartmentId: 4,  apartmentNumber: "201", shareholderId: 4, shareholderName: "خالد عمر مصطفى",    ownershipPercentage: 50  },
  { id: 6,  apartmentId: 7,  apartmentNumber: "101", shareholderId: 2, shareholderName: "محمد خالد إبراهيم", ownershipPercentage: 75  },
  { id: 7,  apartmentId: 7,  apartmentNumber: "101", shareholderId: 6, shareholderName: "عمر سعيد فاروق",    ownershipPercentage: 25  },
  { id: 8,  apartmentId: 8,  apartmentNumber: "201", shareholderId: 2, shareholderName: "محمد خالد إبراهيم", ownershipPercentage: 100 },
  { id: 9,  apartmentId: 11, apartmentNumber: "A1",  shareholderId: 4, shareholderName: "خالد عمر مصطفى",    ownershipPercentage: 40  },
  { id: 10, apartmentId: 11, apartmentNumber: "A1",  shareholderId: 5, shareholderName: "منى إبراهيم يوسف",  ownershipPercentage: 60  },
];
