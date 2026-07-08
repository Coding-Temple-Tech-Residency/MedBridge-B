import { useCompleteFollowUp, useCreateFollowUp, useDeleteFollowUp, useListFollowUp, useUpdateFollowUp } from "../api/follow-up.queries"


export const useFollowUpDomain = (document_id: string) => {

    const {
        data: followUpData,
        isPending: listPending,
        isError: isListError,
        error: listError
    } = useListFollowUp(document_id);


    const {
        mutate: createMutation,
        isPending: createPending,
        isError: isCreateError,
        error: createError
    } = useCreateFollowUp();

    const {
        mutate: updateMutation,
        isPending: updatePending,
        variables: updateVars,
        isError: isUpdateError,
        error: updateError
    } = useUpdateFollowUp();

    const {
        mutate: deleteMutation,
        isPending: deletePending,
        variables: deletingId,
        isError: isDeleteError,
        error: deleteError
    } = useDeleteFollowUp();

    const {
        mutate: completeMutation,
        isPending: completePending,
        variables: completingId,
        isError: isCompleteError,
        error: completeError
    } = useCompleteFollowUp();


    const isPending =
        listPending

    const hasError =
        isListError ||
        isCreateError ||
        isUpdateError ||
        isDeleteError ||
        isCompleteError;

    const errorMessage =
        listError?.message ||
        createError?.message ||
        updateError?.message ||
        deleteError?.message ||
        completeError?.message ||
        "An unexpected error occurred in teh follow-up management domain.";


    const isFollowUpListEmpty =
        !listPending &&
        !listError &&
        (!followUpData || followUpData.length === 0);

    const viewConfigs = {
        taskWorkspace: {
            title: "Action Item Tracker",
            description: "Review, update, and manage essential clinical milestones and follow-up objectives generated from this file.",
            icon: "📋",
        },
        emptyWorkspace: {
            title: "No Follow-Ups Recorded",
            description: "No required action items or follow-ups have been assigned to this record yet. Create a manual item below to get started.",
            icon: "✅",
        },
        creationForm: {
            title: "Create New Action Item",
            description: "Add a specific medical directive, tracking milestone, or follow-up protocol for this record.",
            icon: "➕",
        }
    };


    return {
        data: {
            followUpsList: followUpData || [],
            rawResponse: followUpData,
        },

        flags: {
            isPending,
            hasError,
            errorMessage,
            isFollowUpListEmpty,
            isCreating: createPending,
            isUpdating: updatePending ? updateVars?.followup_id: null,
            isCompleting: completePending ? completingId : null,
            isDeleting: deletePending ? deletingId : null,
            isActionInFlight: createPending || updatePending || deletePending || completePending

        },

        actions: {
            createFollowUp: (body: any) => createMutation({ document_id, body }),
            updateFollowUp: (followup_id: string, body: any) => updateMutation({ followup_id, body }),
            deleteFollowUp: (followup_id: string) => deleteMutation(followup_id),
            completeFollowUp: (followup_id: string) => completeMutation(followup_id),
        },

        viewConfigs,
    };
};



