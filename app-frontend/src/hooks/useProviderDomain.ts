import { useAddProvider, useDeleteProvider, useListProviders, useUpdateProvider } from "../api/providers.queries";

export const useProvidersDomain = () => {

    const {
        data: providersData,
        isPending: listPending,
        isError: isListError,
        error: listError
    } = useListProviders();


    const {
        mutate: addMutation,
        isPending: addPending,
        isError: isAddError,
        error: addError
    } = useAddProvider();

    const {
        mutate: updateMutation,
        isPending: updatePending,
        variables: updateVars,
        isError: isUpdateError,
        error: updateError
    } = useUpdateProvider();

    const {
        mutate: deleteMutation,
        isPending: deletePending,
        variables: deletingId,
        isError: isDeleteError,
        error: deleteError
    } = useDeleteProvider();



    const isPending = listPending;


    const hasError = isListError || isAddError || isUpdateError || isDeleteError;


    const errorMessage =
        listError?.message ||
        addError?.message ||
        updateError?.message ||
        deleteError?.message ||
        "An unexpected error occurred within the provider directory configuration.";


    const isProviderListEmpty =
        !listPending &&
        !isListError &&
        (!providersData || providersData.length === 0);



    const viewConfigs = {
        directoryWorkspace: {
            title: "Healthcare Provider Directory",
            description: "View, manage, and audit clinical staff assignments, system roles, and operational readiness profiles.",
            icon: "🏥",
        },
        emptyDirectory: {
            title: "No Providers Registered",
            description: "Your organization's clinician registry is currently empty. Add your first clinical provider profile below.",
            icon: "👩‍⚕️",
        },
        registrationForm: {
            title: "Register New Provider",
            description: "Establish a new clinician profile, configure access levels, and enable system tracking flags.",
            icon: "📇",
        }
    };



    return {
        data: {
            providersList: providersData || [],
            rawResponse: providersData,
        },

        flags: {
            isPending,
            hasError,
            errorMessage,
            isProviderListEmpty,
            isAdding: addPending,
            isUpdating: updatePending ? updateVars?.provider_id : null,
            isDeleting: deletePending ? deletingId : null,
            isActionInFlight: addPending || updatePending || deletePending
        },

        actions: {
            registerProvider: (body: any) => addMutation(body),
            updateProviderProfile: (provider_id: string, body: any) => updateMutation({ provider_id, body }),
            removeProvider: (provider_id: string) => deleteMutation(provider_id),
        },

        viewConfigs,
    };
};