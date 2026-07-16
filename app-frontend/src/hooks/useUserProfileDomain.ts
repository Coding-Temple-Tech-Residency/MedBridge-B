import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiHelper } from "../api/apiHelper";
import type { UserProfile, UserProfileUpdate } from "../types/auth";

export const useUserProfileDomain = () => {
  const queryClient = useQueryClient();

  // 1️⃣ Load profile (backend extracts user_id from JWT)
  const {
    data: profileData,
    isPending: isProfilePending,
    isError: isProfileError,
    error: profileError,
  } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: () =>
      apiHelper({
        url: "http://localhost:8000/user/profile",
        method: "GET",
      }),
  });

  // 2️⃣ Update profile (PATCH /user/profile)
  const {
    mutate: updateProfileMutation,
    isPending: isUpdatePending,
    isError: isUpdateError,
    error: updateError,
  } = useMutation<UserProfile, Error, UserProfileUpdate>({
    mutationFn: (body) =>
      apiHelper({
        url: "http://localhost:8000/user/profile",
        method: "PATCH",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  return {
    data: {
      profile: profileData,
    },
    flags: {
      isPending: isProfilePending,
      hasError: isProfileError || isUpdateError,
      errorMessage:
        profileError?.message ||
        updateError?.message ||
        "An unexpected error occurred while loading your profile.",
      isUpdating: isUpdatePending,
    },
    actions: {
      updateProfile: (body: UserProfileUpdate) => updateProfileMutation(body),
    },
  };
};
