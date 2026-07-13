import { useQuery } from "@tanstack/react-query";
import { apiHelper } from "./apiHelper";
import type { AppConfig } from "../types/appConfig";





export const useGetApplicationConfig = () => {
    return useQuery<AppConfig>({
        queryKey: ["config"],
        queryFn: () => {
            return apiHelper({
                url: "http://localhost:8000/app/config",
                method: "GET",
                body: null,
            });
        },
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    })
}