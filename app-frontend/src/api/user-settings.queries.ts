import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiHelper } from "./apiHelper";

export interface UserSettingsResponse {
  id: string;
  allow_trusted_contacts: boolean;
  allow_mychart_integration: boolean;
  enable_reminders: boolean;
  updated_at: string;
}

export interface UpdateUserSettings {
  allow_trusted_contacts: boolean | null;
  allow_mychart_integration: boolean | null;
  enable_reminders: boolean | null;
}

// GET — backend extracts user from JWT
export const useGetUserSettings = () => {
  return useQuery<UserSettingsResponse>({
    queryKey: ["user-settings"],
    queryFn: () =>
      apiHelper({
        url: "http://localhost:8000/user-settings",
        method: "GET",
        body: null,
      }),
  });
};

// PATCH — backend extracts user from JWT
export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation<UserSettingsResponse, Error, UpdateUserSettings>({
    mutationFn: (body) =>
      apiHelper({
        url: "http://localhost:8000/user-settings",
        method: "PATCH",
        body,
      }),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },

    onError: (error) => {
      console.error("Failed to update user settings.", error);
    },
  });
};
