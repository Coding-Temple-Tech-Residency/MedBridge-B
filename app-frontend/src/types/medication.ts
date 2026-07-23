export interface MedicationResponse{
    id: string;
    user_id: string;
    name: string;
    code?: string | null;
    code_system?: string | null;
    dose?: string | null;
    frequency?: string | null;
    route?: string | null;
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    prescribing_provider?: string | null;
    reason?: string | null;
    notes?: string | null;
    created_at: string;
    updated_at?: string | null;
    dosage: string | null;
    is_active: boolean;
} 


export interface MedicationCreate {
    code?: string | null;
    code_system?: string | null;
    dosage?: string | null;
    route?: string | null;
    frequency?: string | null;
    status?: string | null;
    is_active?: boolean | null;
    start_date?: string | null;
    end_date?: string | null;
    prescribing_provider?: string | null;
    reason?: string | null;
    notes?: string | null;
    name: string;
}


export interface MedicationUpdate {
    code?: string | null;
    code_system?: string | null;
    dosage?: string | null;
    route?: string | null;
    frequency?: string | null;
    status?: string | null;
    is_active?: boolean | null;
    start_date?: string | null;
    end_date?: string | null;
    prescribing_provider?: string | null;
    reason?: string | null;
    notes?: string | null;
    name?: string;
}


export interface ConfirmPrescriptionMedicationsRequest {
  medications: Array<{
    name: string;
    dosage?: string | null;
    frequency?: string | null;
    route?: string | null;
    status?: string | null;
    is_active?: boolean | null;
    start_date?: string | null;
    end_date?: string | null;
    prescribing_provider?: string | null;
    reason?: string | null;
    notes?: string | null;
    code?: string | null;
    code_system?: string | null;
  }>;
}

export interface ConfirmPrescriptionMedicationsResponse {
  document_id: string;
  medications: MedicationResponse[];
}


export interface MedicationFilters {
    status?: string | null;
    is_active?: boolean | null;
}

export interface PendingMedication {
  name: string;
  dose?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  route?: string | null;
  prescribing_provider?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  reason?: string | null;
  notes?: string | null;
}
