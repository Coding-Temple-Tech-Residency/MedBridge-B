import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiHelper } from "./apiHelper";
import type { FeedbackSubmit, EventLog, UserSettingsUpdate } from "../types/analytics";




export const useSubmitFeedback = (userId: string) => {
    // const queryClient = useQueryClient();

    return useMutation<void, Error, FeedbackSubmit>({
        mutationFn: (body: FeedbackSubmit) => {
            return apiHelper({
                url: "http://localhost:8000/analytics/feedback",
                method: "POST",
                body: body,
                tokenOverride: userId 
            });
        },
        onSuccess: (data) => {
            console.log("Feedback successful:", data);
            // queryClient.invalidateQueries({ queryKey: ["analytics", "feedback", userId] });
        },
        onError: (error) => {
            console.error("Feedback failed:", error);
        },
    });
};

export const useLogEvent = (userId: string) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, EventLog>({
        mutationFn: (body: EventLog) => {
            return apiHelper({
                url: "http://localhost:8000/analytics/events",
                method: "POST",
                body: body,
                tokenOverride: userId 
            });
        },
        onSuccess: (data) => {
            console.log("Event successfully set:", data);
            queryClient.invalidateQueries({ queryKey: ["analytics", "events", userId] });
        },
        onError: (error) => {
            console.error("Event Post failed:", error);
        }
    });
};

export const useUpdateUserSettings = (userId: string) => {
    const queryClient = useQueryClient();

    return useMutation<void, Error, UserSettingsUpdate>({
        mutationFn: (body: UserSettingsUpdate) => {
            return apiHelper({
                url: "http://localhost:8000/analytics/settings",
                method: "PATCH",
                body: body,
                tokenOverride: userId 
            });
        },
        onSuccess: (data) => {
            console.log("User settings successfully changed:", data);
            queryClient.invalidateQueries({ queryKey: ["analytics", "settings", userId] });
            queryClient.invalidateQueries({ queryKey: ["analytics", "dashboard", userId] });
        },
        onError: (error) => {
            console.error("Error updating user settings:", error);
        }
    });
};




export const useGetUserSettings = (userId: string) => {
    return useQuery({
       
        queryKey: ["analytics", "settings", userId],
        queryFn: () => {
            return apiHelper({
                url: "http://localhost:8000/analytics/settings",
                method: "GET",
                body: null,
                tokenOverride: userId 
            });
        },
        enabled: !!userId 
    });
};

export const usePatientDashboard = (userId: string) => {
    return useQuery({
        queryKey: ["analytics", "dashboard", userId, "patient"],
        queryFn: () => {
            return apiHelper({
                url: "http://localhost:8000/analytics/dashboard/patient",
                method: "GET",
                body: null,
                tokenOverride: userId 
            });
        },
        enabled: !!userId
    });
};

export const useStakeholderDashboard = (userId: string) => {
    return useQuery({
        queryKey: ["analytics", "dashboard", userId, "stakeholder"],
        queryFn: () => {
            return apiHelper({
                url: "http://localhost:8000/analytics/dashboard/stakeholder",
                method: "GET",
                body: null,
                tokenOverride: userId
            });
        },
        enabled: !!userId
    });
};

export const useTeamDashboard = (userId: string) => {
    return useQuery({
        queryKey: ["analytics", "dashboard", userId, "team"],
        queryFn: () => {
            return apiHelper({
                url: "http://localhost:8000/analytics/dashboard/team",
                method: "GET",
                body: null,
                tokenOverride: userId 
            });
        },
        enabled: !!userId
    });
};

export const useProviderReadinessDashboard = (userId: string) => {
    return useQuery({
        queryKey: ["analytics", "dashboard", userId, "provider-readiness"],
        queryFn: () => {
            return apiHelper({
                url: "http://localhost:8000/analytics/dashboard/provider-readiness",
                method: "GET",
                body: null,
                tokenOverride: userId 
            });
        },
        enabled: !!userId
    });
};