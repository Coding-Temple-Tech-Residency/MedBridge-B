import { useModal } from "../context/ModalContext";
import { useDocumentsDomain } from "../hooks/useDocumentsDomain"
import { useMedicationDomain } from "../hooks/useMedicationDomain";
import { DeleteConfirm } from "./DeleteConfirm";
import { ErrorState } from "./ErrorState";
import { FormFactory } from "./FormFactory";
import { LoadingSpinner } from "./LoadingSpinner";
import { useRef, useState } from "react";


interface UploadDocumentsProps {
    selectedDocumentId: string | null;
    onSelectDocument: (id: string) => void;
}
export const localPdfCache: Record<string, string> = {};

export const UploadDocuments = ({ selectedDocumentId, onSelectDocument }: UploadDocumentsProps) => {
    const { data: documents, actions, flags, viewConfigs } = useDocumentsDomain(selectedDocumentId || undefined, onSelectDocument);
    const { data: medication, actions: medicationActions, flags: medicationFlags } = useMedicationDomain();
    const { openModal, closeModal } = useModal();

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [deleteId, setDeleteId] = useState<string | null>(null);

    if (flags.isPending) return <LoadingSpinner />;
    if (flags.hasError) return <ErrorState error={flags.errorMessage} />;

    const handleContainerClick = () => {
        fileInputRef.current?.click();
    };

    const processFiles = async (files: FileList | null) => {
        if (files && files.length > 0) {
            const selectedFile = files[0];

            const localBlobUrl = URL.createObjectURL(selectedFile);
            localPdfCache[selectedFile.name] = localBlobUrl;

            const formData = new FormData();
            formData.append("file", selectedFile);
            const uploadResult = await actions.uploadFile(formData);
            if (uploadResult?.is_prescription) {

                const extracted = uploadResult.extracted_data || {};

                const initialData = {
                    name: extracted.name || selectedFile.name.replace(/\.[^/.]+$/, ""),
                    dosage: extracted.dosage || "",
                    frequency: extracted.frequency || "",
                    route: extracted.route || "",
                    start_date: extracted.start_date || new Date().toISOString().split("T")[0],
                    end_date: extracted.end_date || extracted.start_date || new Date().toISOString().split("T")[0],
                    prescribing_provider: extracted.prescribing_provider || "",
                    reason: extracted.reason || "",
                    notes: extracted.instructions || extracted.notes || "",
                };

                openModal(
                    <div className="calendar-modal-content">
                        <h3 className="calendar-modal-title">Prescription Detected</h3>
                        <p>Review the extracted details before adding to your medication schedule.</p>

                        <FormFactory
                            config="medication"
                            initialData={initialData}
                            isPending={medicationFlags.isActionInFlight}
                            activeError={null}
                            submitLabel="Confirm & Add Medication"
                            onSubmit={(values) => {
                                medicationActions.addMedication({
                                    name: values.name,
                                    dosage: values.dosage,
                                    frequency: values.frequency,
                                    route: values.route,
                                    start_date: values.start_date,
                                    end_date: values.end_date || values.start_date,
                                    prescribing_provider: values.prescribing_provider,
                                    reason: values.reason,
                                    notes: values.notes || "",
                                    is_active: true,
                                });
                                closeModal();
                            }}
                        />
                    </div>
                )
            }
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(event.target.files);
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        processFiles(event.dataTransfer.files);
    };

    return (
        <div className="upload-document-container">
            <div className="upload-header">
                <h2>{viewConfigs.documentLibrary.icon} {viewConfigs.documentLibrary.title}</h2>
                <p>{viewConfigs.documentLibrary.description}</p>
            </div>

            <div
                className="upload-background-container"
                onClick={handleContainerClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="file-input-hidden"
                />
                <p>{flags.isProcessingFile
                    ? "⏳ Uploading..."
                    : `+ ${viewConfigs.documentLibrary.title || "Upload Document"}`}
                </p>
                <p className="upload-subtext">Click or Drop Here</p>
            </div>

            {flags.isDocumentListEmpty ? (
                <div className="empty-documents-list">
                    <span className="empty-icon">{viewConfigs.emptyLibrary.icon}</span>
                    <h4>{viewConfigs.emptyLibrary.title}</h4>
                    <p>{viewConfigs.emptyLibrary.description}</p>
                </div>
            ) : (
                <div className="documents-grid">
                    {documents.documentList?.map((doc) => {
                        const isSelected = selectedDocumentId === doc.document_id;
                        const isPromptingDelete = deleteId === doc.document_id;

                        return (
                            <div
                                key={doc.document_id}
                                className={`document-card ${isSelected ? 'active-card' : ''}`}
                                onClick={() => onSelectDocument(doc.document_id)}
                            >
                                <div className="document-info">
                                    <h4>{doc.file_name}</h4>
                                    <p className="document-date">
                                        {new Date(doc.uploaded_at).toLocaleDateString()}
                                    </p>
                                </div>

                                {isPromptingDelete ? (
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <DeleteConfirm
                                            id={doc.document_id}
                                            type="document"
                                            name={doc.file_name}
                                            onCancel={() => setDeleteId(null)}
                                            onDeleteConfirm={(id) => {
                                                actions.deleteFile(id);
                                                setDeleteId(null);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <button
                                        className="delete-document-btn"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setDeleteId(doc.document_id);
                                        }}
                                        disabled={flags.isDeletingFile === doc.document_id}
                                    >
                                        {flags.isDeletingFile === doc.document_id ? "..." : "🗑️"}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};