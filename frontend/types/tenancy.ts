export type TenancyStatus = 'future' | 'active' | 'moving_out' | 'moved_out';

export interface RenterUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
}

export interface Renter {
  id: number;
  tenancy: number;
  user: RenterUser;
  is_primary: boolean;
  joined_at: string;
}

export interface PrimaryRenter {
  id: number;
  name: string;
  email: string;
}

export interface Tenancy {
  id: number;
  household: number;
  household_name: string;
  name: string;
  status: TenancyStatus;
  start_date: string;
  end_date: string | null;
  monthly_rent: string; // Decimal as string
  deposit: string; // Decimal as string
  proof_document: string | null;
  inventory_report: string | null;
  checkout_reading: string | null;
  renter_count: number;
  renters: Renter[];
  primary_renter: RenterUser | null;
  created_at: string;
  updated_at: string;
}

export interface TenancyListItem {
  id: number;
  household: number;
  household_name: string;
  name: string;
  status: TenancyStatus;
  start_date: string;
  end_date: string | null;
  monthly_rent: string;
  deposit: string;
  proof_document: string | null;
  inventory_report: string | null;
  checkout_reading: string | null;
  renter_count: number;
  renters: Renter[];
  primary_renter: PrimaryRenter | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTenancyData {
  household_id: number;
  start_date: string;
  end_date?: string;
  monthly_rent: string;
  deposit: string;
  status?: TenancyStatus;
  renters?: CreateRenterData[];
}

export interface UpdateTenancyData {
  start_date?: string;
  end_date?: string;
  monthly_rent?: string;
  deposit?: string;
  status?: TenancyStatus;
}

export interface CreateRenterData {
  email: string;
  first_name?: string;
  last_name?: string;
  is_primary?: boolean;
}

export interface AddRenterData {
  email: string;
  first_name?: string;
  last_name?: string;
  is_primary?: boolean;
}

export interface StartMoveoutData {
  end_date: string;
}

export interface TenanciesResponse {
  success: boolean;
  results: TenancyListItem[];
}

export interface TenancyResponse {
  success: boolean;
  data: Tenancy;
}

export interface TenancyFilters {
  status?: TenancyStatus;
  household?: number;
  search?: string;
}
