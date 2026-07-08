import { useListReminders, useCreateReminder, useUpdateReminder, useDeleteReminder, useCompleteReminder } from "../api/reminders.queries";

export const useRemindersDomain = () => {

    const {
        data: remindersData,
        isPending: listPending,
        isError: isListError,
        error: listError
    } = useListReminders();


    const {
        mutate: createMutation,
        isPending: createPending,
        isError: isCreateError,
        error: createError
    } = useCreateReminder();

    const {
        mutate: updateMutation,
        isPending: updatePending,
        variables: updateVars,
        isError: isUpdateError,
        error: updateError
    } = useUpdateReminder();

    const {
        mutate: deleteMutation,
        isPending: deletePending,
        isError: isDeleteError,
        variables: deletingId,
        error: deleteError
    } = useDeleteReminder();

    const {
        mutate: completeMutation,
        isPending: completePending,
        isError: isCompleteError,
        variables: completingId,
        error: completeError
    } = useCompleteReminder();


    const isPending = listPending


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
        "An unexpected issue occurred within your reminders schedule.";


    const isReminderListEmpty =
        !listPending &&
        !isListError &&
        (!remindersData || remindersData.length === 0);



    const viewConfigs = {
        scheduleWorkspace: {
            title: "Care Schedule & Reminders",
            description: "Track time-sensitive health tasks, follow-up notifications, and critical patient alerts.",
            icon: "⏰",
        },
        emptyWorkspace: {
            title: "All Caught Up!",
            description: "You have no pending reminders or scheduled alerts right now. Enjoy the clear calendar!",
            icon: "🎉",
        },
        creationForm: {
            title: "Schedule New Reminder",
            description: "Set an alert window, frequency parameters, and task instructions for an upcoming objective.",
            icon: "🔔",
        }
    };



    return {

        data: {
            remindersList: remindersData || [],
            rawResponse: remindersData,
        },


        flags: {
            isPending,
            hasError,
            errorMessage,
            isReminderListEmpty,
            isCreating: createPending,
            isUpdating: updatePending ? updateVars?.reminder_id : null,
            isDeleting: deletePending ? deletingId : null,
            isCompleting: completePending ? completingId : null,
            isActionInFlight: createPending || updatePending || deletePending || completePending,
        },

        actions: {
            scheduleReminder: (body: any) => createMutation(body),
            modifyReminder: (reminder_id: string, body: any) => updateMutation({ reminder_id, body }),
            removeReminder: (reminder_id: string) => deleteMutation(reminder_id),
            markAsComplete: (reminder_id: string) => completeMutation(reminder_id),
        },

        viewConfigs,
    };
};