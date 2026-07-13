import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiHelper } from "./apiHelper"
import type { UserSettingsResponse, UpdateUserSettings } from "../types/userSettings"



export const useGetUserSettings = (user_id: string) => {
    return useQuery<UserSettingsResponse>({
        queryKey: ["user-settings", user_id],
        queryFn: () => {
            return apiHelper({
                url: `http://localhost:8000/user-settings/?user_id=${user_id}`,
                method: "GET",
                body: null
            })
        },
        enabled: !!user_id
    })

}

export const useUpdateUserSettings = (user_id: string) => {
    const queryClient = useQueryClient();

    return useMutation<UserSettingsResponse, Error, UpdateUserSettings>({
        mutationFn: (body) => {
            return apiHelper({
                url: `http://localhost:8000/user-settings/?user_id=${user_id}`,
                method: "PATCH",
                body: body
            })
        },
        onSuccess: (data) => {
            console.log(`User ${user_id} settings have been updated.`, data)
            queryClient.invalidateQueries({ queryKey: ["user-settings", user_id] })

        },
        onError: (error) => {
            console.error("Failed to update user settings.", error)
        }


    })

}