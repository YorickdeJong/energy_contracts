export interface OnboardingStatus {
  is_onboarded: boolean;
  current_step: number;
}

export interface HouseholdOnboardingData {
  name: string;
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
}

export interface LandlordUpdateData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

export interface TenancyAgreement {
  id: number;
  household: number;
  file: string;
  file_name: string;
  file_size: number;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  extracted_data: ExtractedTenantData | null;
  uploaded_at: string;
  processed_at: string | null;
}

export interface RenterExtractedData {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  is_primary: boolean;
}

export interface ExtractedRenterWithId extends RenterExtractedData {
  id: string;
  isEditing?: boolean;
}

export interface ExtractedTenantData {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  // New tenancy-specific fields
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number | null;
  deposit: number | null;
  renters: RenterExtractedData[];
}

export interface TenantData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
}

export interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'failed';
  progress: number;
  agreementId?: number;
  extractedData?: ExtractedTenantData;
  error?: string;
  url?: string;
}

export interface TenancyConfirmData {
  tenancy_agreement_id: number;
  tenancy_name: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  deposit: number;
}
