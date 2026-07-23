import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type MedicationCreate, type MedicationFilters, type MedicationResponse, type MedicationUpdate } from "../types/medication"
import { apiHelper } from "./apiHelper"

import { API_BASE_URL as BASE_URL } from "../config/env";

export const useListMedications = (filters?: MedicationFilters) => {
    return useQuery<MedicationResponse[]>({
        queryKey: ["medications", filters],
        queryFn: () => {
            return apiHelper({
                url: `${BASE_URL}/medications`,
                method: "GET",
                params: filters as any
            })
        }
    })
}


export const useCreateMedication = () => {
    const queryClient = useQueryClient();
    return useMutation<MedicationResponse, Error, MedicationCreate>({
        mutationFn: (body) => {
            return apiHelper({
                url: `${BASE_URL}/medications`,
                method: "POST",
                body: body
            })
        },
        onSuccess: (data) => {
            console.log("Medication Successfully created", data)
            queryClient.invalidateQueries({ queryKey: ["medications"] })
        },
        onError: (error) => {
            console.error("Error creating Medication", error)
        }
    })
}

export const useGetMedication = (medication_id: string) => {
    return useQuery<MedicationResponse>({
        queryKey: ["medications", medication_id],
        queryFn: () => {
            return apiHelper({
                url: `${BASE_URL}/medications/${medication_id}`,
                method: "GET"
            })
        },
        enabled: !!medication_id
    })
}


export const useReplaceMedication = () => {
    const queryClient = useQueryClient();
    return useMutation<MedicationResponse, Error, { medication_id: string, body: MedicationCreate }>({
        mutationFn: ({ medication_id, body }) => {
            return apiHelper({
                url: `${BASE_URL}/medications/${medication_id}`,
                method: "PUT",
                body: body
            })
        },
        onSuccess: (data, { medication_id }) => {
            console.log("Meciation successfully replaced", data)
            queryClient.invalidateQueries({ queryKey: ["medications", medication_id] });
            queryClient.invalidateQueries({ queryKey: ["medications"], exact: true });
        },
        onError: (error) => {
            console.error("Error replacing medication", error)
        }
    })
}

export const useUpdateMedication = () => {
    const queryClient = useQueryClient();
    return useMutation<MedicationResponse, Error, { medication_id: string, body: MedicationUpdate }>({
        mutationFn: ({ medication_id, body }) => {
            return apiHelper({
                url: `${BASE_URL}/medications/${medication_id}`,
                method: "PATCH",
                body: body
            })
        },
        onSuccess: (data, { medication_id }) => {
            console.log("Meciation successfully updated", data)
            queryClient.invalidateQueries({ queryKey: ["medications", medication_id] });
            queryClient.invalidateQueries({ queryKey: ["medications"], exact: true });
        },
        onError: (error) => {
            console.error("Error updating medication", error)
        }
    })
}

export const useDeleteMedication = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (medication_id: string) => {
            return apiHelper({
                url: `${BASE_URL}/medications/${medication_id}`,
                method: "DELETE",
            })
        },
        onSuccess: (_, medication_id) => {
            console.log("Meciation successfully deleted")
            queryClient.invalidateQueries({ queryKey: ["medications", medication_id] });
            queryClient.invalidateQueries({ queryKey: ["medications"], exact: true });
        },
        onError: (error) => {
            console.error("Error deleting medication", error)
        }
    })
}
