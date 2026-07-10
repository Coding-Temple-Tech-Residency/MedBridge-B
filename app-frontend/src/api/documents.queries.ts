import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiHelper } from "./apiHelper";
import { type SummaryResponse, type DocumentListResponse, type DocumentResponse, type UploadResponse, type PrepResponse, type DashboardResponse } from "../types/documents";


export const useUploadDocument = (onUploadComplete: (document_id: string) => void) => {
    const queryClient = useQueryClient();
    return useMutation<UploadResponse, Error, FormData>({
        mutationFn: (body: FormData) => {
            return apiHelper({
                url: "http://localhost:8000/documents/upload",
                method: "POST",
                body: body,
            });
        },
        onSuccess: (data) => {
            console.log("File uploaded successfully:", data);
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            onUploadComplete(data.document_id);

        },

        onError: (error) => {
            console.error("Error with uploading file", error);
        }

    })
}


export const useListDocuments = () => {
    return useQuery<DocumentListResponse>({
        queryKey: ["documents"],
        queryFn: () => {
            return apiHelper({
                url: "http://localhost:8000/documents",
                method: "GET",
                body: null,
            })
        }
    })
}


export const useGetDocument = (document_id: string) => {
    return useQuery<DocumentResponse>({
        queryKey: ["documents", document_id],
        queryFn: async () => {
                return apiHelper({
                    url: `http://localhost:8000/documents/${document_id}`,
                    method: "GET",
                    body: null,
                })
        },
        enabled: !!document_id,
        refetchInterval: (query) => {
            if (!document_id) return false;
            const docData = query.state.data;
            const hasExtractedText = !!docData?.extracted_text || !!docData?.raw_text || (docData as any)?.content ;
            return hasExtractedText ? false : 3000
        }
    })
}


export const useDeleteDocument = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (document_id: string) => {
            return apiHelper({
                url: `http://localhost:8000/documents/${document_id}`,
                method: "DELETE",
                body: null,
            })
        },
        onSuccess: (data, document_id) => {
            console.log(`Document ${document_id} successfully deleted:`, data);
            queryClient.invalidateQueries({ queryKey: ["documents"] })
        },

        onError: (error) => {
            console.error("Failure to delete document:", error)
        }

    }
    )
}


export const useGetSummary = (document_id: string) => {
    return useQuery<SummaryResponse>({
        queryKey: ["documents", document_id, "summary"],
        queryFn: () => {
            return apiHelper({
                url: `http://localhost:8000/documents/${document_id}/summary`,
                method: "GET",
                body: null,
            })
        },
        enabled: !!document_id,
        refetchInterval: (query) => {
            if (!document_id) return false;
            const summaryData = query.state.data;
            return !summaryData?.summary_text ? 2000 : false;
        }
    })
}


export const useRegenerateSummary = () => {
    const queryClient = useQueryClient();
    return useMutation<SummaryResponse, Error, string>({
        mutationFn: (document_id: string) => {
            return apiHelper({
                url: `http://localhost:8000/documents/${document_id}/summary`,
                method: "POST",
                body: null,
            })
        },
        onSuccess: (data, document_id) => {
            console.log("Document summary successfully submitted", data);
            queryClient.invalidateQueries({ queryKey: ["documents", document_id, "summary"] })
        },
        onError: (error) => {
            console.error("error with submitting summary:", error)
        }

    })
}




export const useGenerateAppointmentPrep = () => {
    const queryClient = useQueryClient();

    return useMutation<PrepResponse, Error, string>({
        mutationFn: (document_id) => {
            return apiHelper({
                url: `http://localhost:8000/documents/${document_id}/prep`,
                method: "POST",
                body: null,
            })
        },
        onSuccess: (data, document_id) => {
            console.log("Appointment has been set", data)
            queryClient.invalidateQueries({ queryKey: ["documents", document_id] })
        },

        onError: (error) => {
            console.error("Problem setting appointment.", error)
        }

    })
}




export const useDashboard = () => {
    return useQuery<DashboardResponse>({
        queryKey: ["documents", "dashboard"],
        queryFn: () => {
            return apiHelper({
                url: "http://localhost:8000/dashboard",
                method: "GET",
                body: null,
            })
        },

    })
}











