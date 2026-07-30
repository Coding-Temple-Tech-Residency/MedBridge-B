import { useCreatePatientProfile, useGetUserProfile, useUpdatePatientProfile } from "../api/user-profile.queries";

export const useUserProfileDomain = () => {
  const {
    data: profileData,
    isPending: isProfilePending,
    isError: isProfileError,
    error: profileError,
  } = useGetUserProfile();

  const {
    mutate: updateProfile,
    isPending: isUpdateProfilePending,
    isError: isUpdateProfileError,
    error: updateProfileError,
  } = useUpdatePatientProfile();

  const {
    mutate: createProfile,
    isPending: isCreateProfilePending,
    isError: isCreateProfileError,
    error: createProfileError,
  } = useCreatePatientProfile();

  const isPending = isProfilePending;

  const hasError =
    isProfileError || isUpdateProfileError || isCreateProfileError;

  const errorMessage = hasError
    ? profileError?.message ||
    updateProfileError?.message ||
    createProfileError?.message ||
    "An unexpected error occurred."
    : null;

  const isProfileEmpty =
    !isProfilePending && !isProfileError && !profileData;

  const isUpdating = isUpdateProfilePending;
  const isCreating = isCreateProfilePending;
  const isActionInFlight = isUpdating || isCreating;

  return {
    data: {
      profile: profileData,
    },
    flags: {
      isPending,
      hasError,
      isProfileEmpty,
      errorMessage,
      isUpdating,
      isCreating,
      isActionInFlight,
    },
    actions: {
      updateProfile,
      createProfile,
    },
  };
};

























