import { useRef, useEffect } from "react";
import { useConfirmPrescription, useDashboard, useDeleteDocument, useDismissPrescription, useGenerateAppointmentPrep, useGetDocument, useGetSummary, useListDocuments, useRegenerateSummary, useUploadDocument } from "../api/documents.queries";
import type { ConfirmPrescriptionMedicationsRequest } from "../types/medication";

export const useDocumentsDomain = (
    document_id?: string,
    onUploadComplete?: (document_id: string) => void
) => {
    const {
        data: documentListData,
        isPending: listPending,
        isError: isListError,
        error: listError
    } = useListDocuments();

    const {
        data: dashboardData,
        isPending: dashboardPending,
        isError: isDashboardError,
        error: dashboardError
    } = useDashboard();

   
    const {
        mutateAsync: uploadDocumentAsync,
        isPending: uploadPending,
        isError: isUploadError,
        error: uploadError
    } = useUploadDocument(onUploadComplete || (() => { }));

    const {
        mutate: deleteDocument,
        isPending: deletePending,
        variables: deletingId,
        isError: isDeleteError,
        error: deleteError
    } = useDeleteDocument();

    const {
        data: documentDetailData,
        isPending: detailPending,
        isError: isDetailError,
        error: detailError
    } = useGetDocument(document_id || "");

    const {
        data: summaryData,
        isPending: summaryPending,
        isError: isSummaryError,
        error: summaryError
    } = useGetSummary(document_id || "");

    const {
        mutate: regenerateSummary,
        isPending: regeneratePending,
        isError: isRegenerateError,
        error: regenerateError
    } = useRegenerateSummary();

    const {
        mutate: generateAppointmentPrep,
        isPending: prepPending,
        isError: isPrepError,
        error: prepError
    } = useGenerateAppointmentPrep();

  
    const {
        mutateAsync: confirmPrescriptionAsync,
        isPending: confirmPending,
        isError: isConfirmError,
        error: confirmError
    } = useConfirmPrescription();

    const {
        mutateAsync: dismissPrescriptionAsync,
        isPending: dismissPending,
        isError: isDismissError,
        error: dismissError
    } = useDismissPrescription();

    const triggeredDocuments = useRef<Record<string, boolean>>({});

    const hasRawText = !!(
        documentDetailData?.extracted_text ||
        documentDetailData?.raw_text ||
        (documentDetailData as any)?.content ||
        (documentDetailData as any)?.text_content
    );

    useEffect(() => {
        if (!document_id) return;

        if (hasRawText && !triggeredDocuments.current[document_id]) {
            triggeredDocuments.current[document_id] = true;
            regenerateSummary(document_id);
        }
    }, [hasRawText, document_id, regenerateSummary]);

    const isBackendExtractingText = !!document_id && !hasRawText;
    const isBackendBuildingSummary = !!document_id && !summaryData?.summary_text;

    const isPending = listPending || dashboardPending;

    const hasError =
        isListError || isDashboardError || isUploadError ||
        isDeleteError || isDetailError || isSummaryError ||
        isRegenerateError || isPrepError || isConfirmError || isDismissError;

    const errorMessage =
        listError?.message || dashboardError?.message || uploadError?.message ||
        deleteError?.message || detailError?.message || summaryError?.message ||
        regenerateError?.message || prepError?.message ||
        confirmError?.message || dismissError?.message ||
        "An unexpected error occurred within the documents workspace.";

    const isDocumentListEmpty =
        !listPending && !isListError && (!documentListData || !documentListData.documents || documentListData.documents.length === 0);

    const isSummaryEmpty =
        !!document_id && !summaryPending && !isSummaryError && (!summaryData || !summaryData.summary_text);

    const viewConfigs = {
        documentLibrary: { title: "Document Vault", description: "Access, view, and manage your uploaded clinical records and health forms.", icon: "📁" },
        emptyLibrary: { title: "Your Vault is Empty", description: "Click to add documents or PDF records here and begin your automated analysis.", icon: "📤" },
        documentSummary: { title: "AI Medical Summary", description: "An automated extraction of key diagnoses, treatment plans, and clinical findings.", icon: "📝" },
        emptySummary: { title: "No Summary Generated", description: "We couldn't locate an automated breakdown for this file. Click below to compile one.", icon: "🤖" },
        appointmentPrep: { title: "Clinical Appointment Brief", description: "A tailored, scannable sheet prepared exclusively to help guide your upcoming clinical conversation.", icon: "🏥" }
    };

    return {
        data: {
            documentList: documentListData?.documents || [],
            metricsDashboard: dashboardData,
            activeDocument: documentDetailData,
            activeSummary: summaryData,
        },
        flags: {
            isPending,
            hasError,
            errorMessage,
            isDocumentListEmpty,
            isSummaryEmpty,
            isSummaryLoading: detailPending || summaryPending || regeneratePending || isBackendBuildingSummary,
            isDocumentLoading: detailPending || uploadPending,
            isBackendExtractingText,
            isProcessingFile: uploadPending || regeneratePending || prepPending || confirmPending || dismissPending,
            isDeletingFile: deletePending ? deletingId : null,
            isConfirmingPrescription: confirmPending,
            isDismissingPrescription: dismissPending,
        },
        actions: {
            uploadFile: (formData: FormData) => uploadDocumentAsync(formData),
            deleteFile: (id: string) => deleteDocument(id),
            reconstructSummary: () => { if (document_id) regenerateSummary(document_id); },
            buildAppointmentBrief: () => { if (document_id) generateAppointmentPrep(document_id); },
          
            confirmPrescription: (
                documentId: string, 
                medications: ConfirmPrescriptionMedicationsRequest["medications"]
            ) => confirmPrescriptionAsync({ document_id: documentId, medications }),
            
            dismissPrescription: (documentId: string) => dismissPrescriptionAsync(documentId),
        },
        viewConfigs,
    };
};