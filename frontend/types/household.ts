export interface Household {
  id: number;
  name: string;
  address: string;
  landlord: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  member_count: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  members?: HouseholdMembership[];
}

export interface HouseholdMembership {
  id: number;
  tenant: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string | null;
  };
  role: 'landlord' | 'tenant';
  joined_at: string;
  is_active: boolean;
}

export interface CreateHouseholdData {
  name: string;
  address: string;
}

export interface UpdateHouseholdData {
  name?: string;
  address?: string;
  is_active?: boolean;
}
