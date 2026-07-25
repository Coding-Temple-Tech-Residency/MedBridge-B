import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiHelper } from "./apiHelper";
import { API_BASE_URL as BASE_URL } from "../config/env";
import type { PatientProfileCreate, PatientProfileResponse, PatientProfileUpdate } from "../types/user-profile";




export const useGetUserProfile = () => {
  return useQuery<PatientProfileResponse>({
    queryKey: ["user-profile"],
    queryFn: () => {
      return apiHelper({
        url: `${BASE_URL}/patient-profile`,
        method: "GET",
        body: null,
      });
    },
  });
};


export const useUpdatePatientProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<PatientProfileResponse, Error, PatientProfileUpdate>({
    mutationFn: (body) =>
      apiHelper({
        url: `${BASE_URL}/patient-profile`,
        method: "PATCH",
        body,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patient-profile"],
      });
    },

    onError: (error) => {
      console.error("Failed to update user profile:", error);
    },
  });
};


export const useCreatePatientProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<PatientProfileResponse, Error, PatientProfileCreate>({
    mutationFn: (body) =>
      apiHelper({
        url: `${BASE_URL}/patient-profile`,
        method: "POST",
        body,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patient-profile"],
      });
    },

    onError: (error) => {
      console.error("Failed to create user profile:", error);
    },
  });
};
