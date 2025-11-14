import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  password: string | null;
  created_at: string;
}

export interface Clinic {
  id: string;
  name: string;
  created_at: string;
}

export interface Provider {
  id: string;
  name: string;
  created_at: string;
}

export interface Program {
  id: string;
  name: string;
  sponsor: string;
  monetary_cap: string;
  description: string;
  enrollment_link: string;
  program_status: string;
  re_enrollment_date: string | null;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  program_id: string;
  status: string | null;
  completion_date: string | null;
  enrolled_at: string;
  updated_at: string;
}

export interface Drug {
  id: string;
  name: string;
  weekly_price: number;
  monthly_price: number;
  yearly_price: number;
  created_at: string;
}

export interface DrugDetail {
  id: string;
  user_id: string;
  drug_name: string;
  drug_id: string | null;
  weekly_price: number | null;
  monthly_price: number | null;
  yearly_price: number | null;
  created_at: string;
}

export interface UserClinic {
  id: string;
  user_id: string;
  clinic_id: string;
  created_at: string;
}

export interface UserProvider {
  id: string;
  user_id: string;
  provider_id: string;
  created_at: string;
}
