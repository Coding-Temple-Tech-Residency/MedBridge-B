import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiHelper } from "./apiHelper";
import type { UserProfile, UserProfileUpdate } from "../types/auth";

import { API_BASE_URL as BASE_URL } from "../config/env";

export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
  language?: string;
  created_at: string;
}

export const useGetUserProfile = () => {
  return useQuery<UserProfileResponse>({
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

// PATCH patient profile
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation<UserProfile, Error, UserProfileUpdate>({
    mutationFn: (body) =>
      apiHelper({
        url: `${BASE_URL}/patient-profile`,
        method: "PATCH",
        body,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user-profile"],
      });
    },

    onError: (error) => {
      console.error("Failed to update user profile:", error);
    },
  });
};
