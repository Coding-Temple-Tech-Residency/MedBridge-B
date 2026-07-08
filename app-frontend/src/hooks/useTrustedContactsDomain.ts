import { useListTrustedContacts, useAddTrustedContact, useUpdateTrustedContact, useRemoveTrustedContact } from "../api/trusted-contacts.queries";

export const useTrustedContactsDomain = () => {
 
    const { 
        data: contactsData, 
        isPending: listPending, 
        isError: isListError, 
        error: listError 
    } = useListTrustedContacts();

    
    const { 
        mutate: addMutation, 
        isPending: addPending, 
        isError: isAddError, 
        error: addError 
    } = useAddTrustedContact();

    const { 
        mutate: updateMutation, 
        isPending: updatePending, 
        isError: isUpdateError, 
        variables: updateVars,
        error: updateError 
    } = useUpdateTrustedContact();

    const { 
        mutate: deleteMutation, 
        isPending: deletePending, 
        isError: isDeleteError,
        variables: deletingId,
        error: deleteError 
    } = useRemoveTrustedContact();



    const isPending = listPending;

  
    const hasError = isListError || isAddError || isUpdateError || isDeleteError;

  
    const errorMessage =
        listError?.message ||
        addError?.message ||
        updateError?.message ||
        deleteError?.message ||
        "An unexpected error occurred within your trusted contacts directory.";

   
    const isContactListEmpty = 
        !listPending && 
        !isListError && 
        (!contactsData || contactsData.length === 0);


    const viewConfigs = {
        contactsWorkspace: {
            title: "Circle of Care & Trusted Contacts",
            description: "Manage trusted individuals, family members, or healthcare proxies authorized to view or coordinate your clinical records.",
            icon: "🛡️",
        },
        emptyContacts: {
            title: "No Trusted Contacts Assigned",
            description: "You haven't granted account access to any trusted contacts or care network individuals yet.",
            icon: "👥",
        },
        invitationForm: {
            title: "Authorize New Contact",
            description: "Grant system permissions, set notification preferences, and issue a secure connection link to a trusted individual.",
            icon: "✉️",
        }
    };



    return {
     
        data: {
            contactsList: contactsData || [],
            rawResponse: contactsData,
        },

        flags: {
            isPending,
            hasError,
            errorMessage,
            isContactListEmpty,
            isAdding: addPending,
            isUpdating: updatePending ? updateVars?.contact_id : null,
            isDeleting: deletePending ? deletingId : null,
            isActionInFlight: addPending || updatePending || deletePending
        },

        actions: {
            addContact: (body: any) => addMutation(body),
            updateContactPermissions: (contact_id: string, body: any) => updateMutation({ contact_id, body }),
            revokeAccess: (contact_id: string) => deleteMutation(contact_id),
        },

        viewConfigs,
    };
};