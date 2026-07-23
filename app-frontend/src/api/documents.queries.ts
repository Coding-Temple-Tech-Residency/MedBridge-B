import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiHelper } from "./apiHelper";
import { type SummaryResponse, type DocumentListResponse, type DocumentResponse, type UploadResponse, type PrepResponse, type DashboardResponse } from "../types/documents";

import { API_BASE_URL as BASE_URL } from "../config/env";
import type { ConfirmPrescriptionMedicationsRequest, ConfirmPrescriptionMedicationsResponse } from "../types/medication";

export const useUploadDocument = (onUploadComplete: (document_id: string) => void) => {
    const queryClient = useQueryClient();
    return useMutation<UploadResponse, Error, FormData>({
        mutationFn: (body: FormData) => {
            return apiHelper({
                url: `${BASE_URL}/documents/upload`,
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
                url: `${BASE_URL}/documents`,
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
                    url: `${BASE_URL}/documents/${document_id}`,
                    method: "GET",
                    body: null,
                })
        },
        enabled: !!document_id,
        refetchOnWindowFocus:false,
        refetchInterval: (query) => {
            if (!document_id) return false;
            const docData = query.state.data;
            const isFinished = 
                docData?.status === "summarized" ||
                docData?.status === "failed";
            return isFinished ? false : 3000;
        }
    })
}

export const useGetDocumentFileUrl = () => {
  return useMutation<{ url: string }, Error, string>({
    mutationFn: (document_id) =>
      apiHelper({
        url: `${BASE_URL}/documents/${document_id}/file`,
        method: "GET",
        body: null,
      }),
    onError: (error) => {
      console.error("Failed to get document file URL:", error);
    },
  });
};

export const useDeleteDocument = () => {
    const queryClient = useQueryClient();
    return useMutation<void, Error, string>({
        mutationFn: (document_id: string) => {
            return apiHelper({
                url: `${BASE_URL}/documents/${document_id}`,
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
                url: `${BASE_URL}/documents/${document_id}/summary`,
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
                url: `${BASE_URL}/documents/${document_id}/summary`,
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
                url: `${BASE_URL}/documents/${document_id}/prep`,
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
                url: `${BASE_URL}/dashboard`,
                method: "GET",
                body: null,
            })
        },

    })
}



export const useConfirmPrescription = () => {
    const queryClient = useQueryClient();

    return useMutation<
        ConfirmPrescriptionMedicationsResponse,
        Error,
        { document_id: string; medications: ConfirmPrescriptionMedicationsRequest["medications"] }
    >({
        mutationFn: ({ document_id, medications }) => {
            return apiHelper({
                url: `${BASE_URL}/documents/${document_id}/medications/confirm`,
                method: "POST",
                body: { medications },
            });
        },
        onSuccess: (_, { document_id }) => {
            console.log("Prescription confirmed successfully");
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["documents", document_id] });
            queryClient.invalidateQueries({ queryKey: ["medications"] });
        },
        onError: (error) => {
            console.error("Failed to confirm prescription:", error);
        },
    });
};

export const useDismissPrescription = () => {
    const queryClient = useQueryClient();

    return useMutation<DocumentResponse, Error, string>({
        mutationFn: (document_id: string) => {
            return apiHelper({
                url: `${BASE_URL}/documents/${document_id}/medications/dismiss`,
                method: "POST",
                body: null,
            });
        },
        onSuccess: (_, document_id) => {
            console.log("Prescription candidates dismissed");
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            queryClient.invalidateQueries({ queryKey: ["documents", document_id] });
        },
        onError: (error) => {
            console.error("Failed to dismiss prescription candidates:", error);
        },
    });
};







