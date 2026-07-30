import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiHelper } from "./apiHelper";
import { API_BASE_URL as BASE_URL } from "../config/env";
import type { PatientProfileCreate, PatientProfileResponse } from "../types/user-profile";
import type { UserProfile, UserProfileUpdate } from "../types/auth";



export const useGetUserProfile = () => {
  return useQuery<UserProfile, Error>({
    queryKey: ["patient-profile"],
    queryFn: () => {
      return apiHelper({
        url: `${BASE_URL}/patient-profile`,
        method: "GET",
        body: null,
      });
    },
  })
}


export const useUpdatePatientProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, Error, UserProfileUpdate>({
    mutationFn: (body) =>
      apiHelper({
        url: `${BASE_URL}/patient-profile`,
        method: "PATCH",
        body,
      }),

    onSuccess: (data) => {
      console.log("Patient Profile successfully updated", data)
      queryClient.invalidateQueries({
        queryKey: ["user-profile"],
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

    onSuccess: (data) => {
      console.log("patient profile was successfully created", data);
      queryClient.invalidateQueries({
        queryKey: ["patient-profile"],
      });
    },

    onError: (error) => {
      console.error("Failed to create user profile:", error);
    },
  });
};
