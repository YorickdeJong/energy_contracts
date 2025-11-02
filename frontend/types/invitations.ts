export interface TenantInvitation {
  id: number;
  email: string;
  household: number;
  household_name: string;
  invited_by: number;
  invited_by_name: string;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  is_valid: boolean;
}

export interface VerifyInvitationResponse {
  valid: boolean;
  email: string;
  household_name: string;
  invited_by: string;
}

export interface AcceptInvitationData {
  token: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

export interface AcceptInvitationResponse {
  message: string;
  user_id: number;
  email: string;
}
