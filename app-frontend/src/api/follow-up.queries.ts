import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FollowUpCreate, FollowUpResponse, FollowUpUpdate } from "../types/features";
import { apiHelper } from "./apiHelper";

export const useListFollowUp = (document_id: string) => {
    return useQuery<FollowUpResponse[]>({
        queryKey: ["documents", document_id, "follow-ups"],
        queryFn: () => {
            return apiHelper({
                url: `http://localhost:8000/documents/${document_id}/follow-ups`,
                method: "GET",
                body: null
            })
        }
    })
}


export const useCreateFollowUp = () => {
    const queryClient = useQueryClient();
    return useMutation<FollowUpResponse, Error, { document_id: string, body: FollowUpCreate }>({
        mutationFn: ({ document_id, body }) => {
            return apiHelper({
                url: `http://localhost:8000/documents/${document_id}/follow-ups`,
                method: "POST",
                body: {
                    ...body,
                    health_record_id: document_id
                }
            })
        },
        onSuccess: (data, { document_id }) => {
            console.log("Follow-up successfully created.", data)
            queryClient.invalidateQueries({ queryKey: ["documents", document_id, "follow-ups"] })

        },
        onError: (error) => {
            console.error("Error creating follow-up.", error)
        }
    })
}


export const useUpdateFollowUp = () => {
    const queryClient = useQueryClient();
    return useMutation<FollowUpResponse, Error, { followup_id: string, body: FollowUpUpdate }>({
        mutationFn: ({ followup_id, body }) => {
            return apiHelper({
                url: `http://localhost:8000/follow-ups/${followup_id}`,
                method: "PATCH",
                body: body
            })
        },
        onSuccess: (data, { followup_id }) => {
            console.log(`Follow-up ${followup_id} has been successfuly updated.`, data);
            queryClient.invalidateQueries({ queryKey: ["documents"] })
        },
        onError: (error) => {
            console.error("Error with updating follow-up", error);
        }

    })
}


export const useDeleteFollowUp = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (followup_id: string) => {
            return apiHelper({
                url: `http://localhost:8000/follow-ups/${followup_id}`,
                method: "DELETE",
                body: null
            })
        },
        onSuccess: () => {
            console.log("Follow-up has been successfully deleted.");
            queryClient.invalidateQueries({ queryKey: ["documents"] })
        },
        onError: (error) => {
            console.error("Error with deleting follow-up.", error);
        }

    })
}


export const useCompleteFollowUp = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (followup_id: string) => {
            return apiHelper({
                url: `http://localhost:8000/follow-ups/${followup_id}/complete`,
                method: "POST",
                body: null
            })
        },
        onSuccess: () => {
            console.log("Follow-up has been successfully completed");
            queryClient.invalidateQueries({ queryKey: ["documents"] })
        },
        onError: (error) => {
            console.error("Error with completing follow-up.", error);
        }

    })
}