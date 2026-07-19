import {
  useGetUserSettings, useUpdateUserSettings,
} from "../api/user-settings.queries";

import type { UserSettingsResponse, UpdateUserSettings } from "../api/user-settings.queries";

const emptySettings: UserSettingsResponse = {
  id: "",
  allow_trusted_contacts: false,
  allow_mychart_integration: false,
  enable_reminders: false,
  updated_at: "",
};

export const useUserSettingsDomain = () => {
  const {
    data: settingsData,
    isPending: fetchPending,
    isError: isFetchError,
    error: fetchError,
  } = useGetUserSettings();

  const {
    mutate: updateMutation,
    isPending: updatePending,
    isError: isUpdateError,
    error: updateError,
  } = useUpdateUserSettings();

  const isPending = fetchPending;

  const hasError = isFetchError || isUpdateError;

  const errorMessage =
    fetchError?.message ||
    updateError?.message ||
    "An unexpected error occurred while processing your account preferences.";

  const isSettingsEmpty = !fetchPending && !isFetchError && !settingsData;

  const viewConfigs = {
    settingsWorkspace: {
      title: "Account Settings & Preferences",
      description:
        "Personalize your dashboard experience, adjust accessibility features, and configure system communication rules.",
      icon: "⚙️",
    },
    saveNotice: {
      title: "Unsaved Modifications",
      description:
        "You have made adjustments to your environment settings. Ensure you commit changes before leaving.",
      icon: "💾",
    },
  };

  return {
    data: {
      settings: settingsData ?? emptySettings,
      rawResponse: settingsData,
    },
    flags: {
      isPending,
      hasError,
      errorMessage,
      isSettingsEmpty,
      isUpdating: updatePending,
      isActionInFlight: updatePending,
    },
    actions: {
      saveSettings: (body: UpdateUserSettings) => {
  const patchBody: UpdateUserSettings = {
    allow_trusted_contacts:
      body.allow_trusted_contacts ?? null,
    allow_mychart_integration:
      body.allow_mychart_integration ?? null,
    enable_reminders:
      body.enable_reminders ?? null,
  };

  updateMutation(patchBody);
},
    },
    viewConfigs,
  };
};
