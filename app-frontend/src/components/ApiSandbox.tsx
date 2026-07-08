import {
    useListReminders,
    useCreateReminder,
    useCompleteReminder,
    useDeleteReminder,
    useUpdateReminder
} from "../api/reminders.queries"
import { useRemindersDomain } from "../hooks/useRemindersDomain";
import { EmptyState } from "./EmptyState";
import { ErrorComponent } from "./ErrorComponent";
import { LoadingSpinner } from "./LoadingSpinner";



//! oldWay: keep track of 5 different hooks and their individual states, strict array checking, guard against undefined. 
export const OldSandbox = () => {

    const { data: reminders, isLoading, isError } = useListReminders();
    const { mutate: createReminder } = useCreateReminder();
    const { mutate: updateReminder } = useUpdateReminder();
    const { mutate: deleteReminder } = useDeleteReminder();
    const { mutate: completeReminder } = useCompleteReminder();

    const targetId = reminders?.[0]?.id || "";

    { if (isLoading) return <LoadingSpinner /> }
    { if (isError) return <h1> Error has occured. </h1> }
    {
        if (reminders?.length === 0) return <EmptyState title="EmptyState" description="Empty description" />
    }

    return (
        <>
            <pre>
                {JSON.stringify(reminders, null, 2)}
            </pre>

            <button onClick={() => createReminder({
                title: "Sandbox Test Reminder",
                reminder_type: "medication",
                remind_at: new Date().toISOString(),
            })}> + Create Reminder
            </button>


            <button onClick={() => updateReminder({
                reminder_id: targetId,
                body: { title: "updated Sandbox Title!" }
            })}
                disabled={!targetId}> ✏️ Update Reminder
            </button>



            <button onClick={() => completeReminder(targetId)}
                disabled={!targetId}>
                ✅ Complete Reminder
            </button>


            <button onClick={() => deleteReminder(targetId)}
                disabled={!targetId}>
                🗑️ Delete Reminder
            </button>

        </>

    )

}





//! new way 1 hook, clean namespace, efficient and consistent for all component creation.
export const ApiSandbox = () => {

    const { data, flags, actions, viewConfigs } = useRemindersDomain();
    const targetId = data.remindersList[0]?.id || "";

    if (flags.isPending) return <LoadingSpinner />
    if (flags.hasError) return <ErrorComponent error={flags.errorMessage} />
    if (flags.isReminderListEmpty) return <EmptyState title={viewConfigs.emptyWorkspace.title} description={viewConfigs.emptyWorkspace.description} />

    return (
        <>
            <pre>
                {JSON.stringify(data.remindersList, null, 2)}
            </pre>
            <button onClick={() => actions.scheduleReminder({
                title: "Sandbox Test Reminder",
                reminder_type: "medication",
                remind_at: new Date().toISOString(),
            })}>
                {flags.isCreating ? "Creating..." : `+ ${viewConfigs.scheduleWorkspace.title}`}
            </button>

            <button
                onClick={() => actions.modifyReminder(targetId, { title: "updated Sandbox Title!" })}
                disabled={!targetId || flags.isUpdating}
            >
                {flags.isUpdating ? "Updating..." : "✏️ Modify Reminder"}
            </button>

            <button
                onClick={() => actions.markAsComplete(targetId)}
                disabled={!targetId || flags.isCompleting}
            >
                {flags.isCompleting ? "Completing..." : "✅ Complete Reminder"}
            </button>

            <button
                onClick={() => actions.removeReminder(targetId)}
                disabled={!targetId || flags.isDeleting}
            >
                {flags.isDeleting ? "Deleting..." : "🗑️ Remove Reminder"}
            </button>
        </>
    );
};