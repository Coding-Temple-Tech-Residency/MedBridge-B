import { useGetUserSettings, useUpdateUserSettings } from "../api/user-settings.queries";

export const useUserSettingsDomain = (user_id: string) => {

    const {
        data: settingsData,
        isPending: fetchPending,
        isError: isFetchError,
        error: fetchError
    } = useGetUserSettings(user_id);


    const {
        mutate: updateMutation,
        isPending: updatePending,
        isError: isUpdateError,
        error: updateError
    } = useUpdateUserSettings(user_id);



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
            description: "Personalize your dashboard experience, adjust accessibility features, and configure system communication rules.",
            icon: "⚙️",
        },
        saveNotice: {
            title: "Unsaved Modifications",
            description: "You have made adjustments to your environment settings. Ensure you commit changes before leaving.",
            icon: "💾",
        }
    };



    return {

        data: {
            settings: settingsData || {},
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
            saveSettings: (body: any) => updateMutation(body),
        },
        viewConfigs,
    };
};