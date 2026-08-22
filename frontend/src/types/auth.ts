export type UserRole = "municipal_officer" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id?: string | null;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}
