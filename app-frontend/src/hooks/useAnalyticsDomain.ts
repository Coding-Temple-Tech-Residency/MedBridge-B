import { useGetUserSettings, useLogEvent, usePatientDashboard, useProviderReadinessDashboard, useStakeholderDashboard, useSubmitFeedback, useTeamDashboard, useUpdateUserSettings } from "../api/analytics.queries"


export const useAnalyticsDomain = () => {

    const { mutate: submitFeedback, data: submitData, isPending: submitPending, isError: isSubmitError, error: submitError } = useSubmitFeedback();
    const { mutate: logEvent, data: eventData, isPending: eventPending, isError: isEventError, error: eventError } = useLogEvent();
    const { data: userSettingsData, isPending: userSettingsPending, isError: isUserSettingsError, error: userSettingsError } = useGetUserSettings();
    const { mutate: updateSettings, variables: updatingSettingField, isPending: updateUserSettingsPending, isError: isUpdateUserSettingsError, error: updateUserSettingsError } = useUpdateUserSettings();
    const { data: patientDashboardData, isPending: patientDashboardPending, isError: isPatientDashboardError, error: patientDashboardError } = usePatientDashboard();
    const { data: stakeholderDashboardData, isPending: stakeholderDashboardPending, isError: isStakeholderDashboardError, error: stakeholderDashboardError } = useStakeholderDashboard();
    const { data: teamDashboardData, isPending: teamDashboardPending, isError: isTeamDashboardError, error: teamDashboardError } = useTeamDashboard();
    const { data: providerReadinessData, isPending: providerReadinessPending, isError: isProviderReadinessError, error: providerReadinessError } = useProviderReadinessDashboard();


    const isPending =
        userSettingsPending
        || patientDashboardPending
        || stakeholderDashboardPending
        || teamDashboardPending
        || providerReadinessPending


    const hasError = isSubmitError
        || isEventError
        || isUserSettingsError
        || isUpdateUserSettingsError
        || isPatientDashboardError
        || isStakeholderDashboardError
        || isTeamDashboardError
        || isProviderReadinessError


    const errorMessage =
        submitError?.message ||
        eventError?.message ||
        userSettingsError?.message ||
        updateUserSettingsError?.message ||
        patientDashboardError?.message ||
        stakeholderDashboardError?.message ||
        teamDashboardError?.message ||
        providerReadinessError?.message ||
        "Something went wrong.";

    const isUserSettingsEmpty =
        !userSettingsPending &&
        !isUserSettingsError &&
        (!userSettingsData || userSettingsData.length === 0);

    const isPatientDashboardEmpty =
        !patientDashboardPending &&
        !isPatientDashboardError &&
        (!patientDashboardData || patientDashboardData.length === 0);

    const isStakeholderDashboardEmpty =
        !stakeholderDashboardPending &&
        !isStakeholderDashboardError &&
        (!stakeholderDashboardData || stakeholderDashboardData.length === 0);

    const isTeamDashboardEmpty =
        !teamDashboardPending &&
        !isTeamDashboardError &&
        (!teamDashboardData || teamDashboardData.length === 0);

    const isProviderReadinessEmpty =
        !providerReadinessPending &&
        !isProviderReadinessError &&
        (!providerReadinessData || Object.keys(providerReadinessData).length === 0);



    const viewConfigs = {
        patientDashboard: {
            title: "Patient Analytics",
            description: "No patient health metrics or activity trends have been recorded yet.",
            icon: "🩺",
        },
        stakeholderDashboard: {
            title: "Stakeholder Overview",
            description: "Executive and stakeholder analytics are currently empty for this region.",
            icon: "💰",
        },
        teamDashboard: {
            title: "Team Performance",
            description: "No clinical team performance data is available for the selected timeframe.",
            icon: "🤝",
        },
        providerReadiness: {
            title: "Provider Readiness",
            description: "Operational readiness scores have not been calculated yet.",
            icon: "🏆",
        },
        feedback: {
            title: "Submit Platform Feedback",
            description: "Encountering an issue or have a feature request? Let our analytics team know.",
            icon: "📝",
        }
    };


    return {
        // 1. Data Payloads
        data: {
            userSettings: userSettingsData,
            patientDashboard: patientDashboardData,
            stakeholderDashboard: stakeholderDashboardData,
            teamDashboard: teamDashboardData,
            providerReadiness: providerReadinessData,
            submitResponse: submitData,
            eventResponse: eventData,
        },

        // 2. Unified UI State Flags
        flags: {
            isPending,
            hasError,
            errorMessage,
            isUserSettingsEmpty,
            isPatientDashboardEmpty,
            isStakeholderDashboardEmpty,
            isTeamDashboardEmpty,
            isProviderReadinessEmpty,
            isSubmittingFeedback: submitPending,
            isLoggingEvent: eventPending,
            isUpdatingSettings: updateUserSettingsPending ? updatingSettingField : null
        },

        // 3. Semantic Action Handlers (Clean execution triggers for the UI)
        actions: {
            submitFeedback,    // Calls the useSubmitFeedback mutation
            logEvent,          // Calls the useLogEvent mutation
            updateSettings,    // Calls the useUpdateUserSettings mutation
        },

        viewConfigs,
    };
};


