import { useDocumentsDomain } from "../hooks/useDocumentsDomain"
import { ErrorComponent } from "./ErrorComponent";
import { LoadingSpinner } from "./LoadingSpinner";
import { useRef } from "react";


interface UploadDocumentsProps {
    selectedDocumentId: string | null;
    onSelectDocument: (id: string) => void;
}

export const UploadDocuments = ({ selectedDocumentId, onSelectDocument }: UploadDocumentsProps) => {

    const { data: documents, actions, flags, viewConfigs } = useDocumentsDomain(selectedDocumentId || undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (flags.isPending) return <LoadingSpinner />
    if (flags.hasError) return <ErrorComponent error={flags.errorMessage} />

    const handleContainerClick = () => {
        fileInputRef.current?.click();
    }

    const processFiles = (files: FileList | null) => {
        if (files && files.length > 0) {
            const selectedFile = files[0];
            const formData = new FormData();
            formData.append("file", selectedFile);
            actions.uploadFile(formData);
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        processFiles(event.target.files);
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        processFiles(event.dataTransfer.files);
    }

    return (
        <div className="upload-document-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
          
            <div className="upload-header">
                <h2>{viewConfigs.documentLibrary.icon} {viewConfigs.documentLibrary.title}</h2>
                <p>{viewConfigs.documentLibrary.description}</p>
            </div>

           
            <div className="upload-background-container"
                onClick={handleContainerClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{ 
                    cursor: "pointer",
                    border: "2px dashed #3182ce",    
                    backgroundColor: "#f7fafc",       
                    padding: "40px 20px",             
                    borderRadius: "8px",              
                    textAlign: "center"               
                }}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                />
                <p>{flags.isProcessingFile
                    ? "⏳ Uploading..."
                    : `+ ${viewConfigs.documentLibrary.title || "Upload Document"}`}
                </p>
                <p style={{ margin: "4px 0 0 0", color: "#718096" }}>Click or Drop Here</p>
            </div>

            {flags.isDocumentListEmpty ? (
                <div className="empty-documents-list">
                    <span className="empty-icon">{viewConfigs.emptyLibrary.icon}</span>
                    <h4>{viewConfigs.emptyLibrary.title}</h4>
                    <p>{viewConfigs.emptyLibrary.description}</p>
                </div>
            ) : (
                <div className="documents-grid" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {documents.documentList?.map((doc) => {
                        
                        const isSelected = selectedDocumentId === doc.document_id;

                        return (
                            <div 
                                key={doc.document_id} 
                                className={`document-card ${isSelected ? 'active-card' : ''}`}
                                onClick={() => onSelectDocument(doc.document_id)} 
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "16px",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    border: isSelected ? "2px solid #3182ce" : "1px solid #e2e8f0",
                                    backgroundColor: isSelected ? "#ebf8ff" : "#ffffff"
                                }}
                            >
                                <div className="document-info">
                                    <h4 style={{ margin: 0 }}>{doc.file_name}</h4>
                                    <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#718096" }}>{doc.uploaded_at}</p>
                                </div>
                                <button
                                    className="delete-document-btn"
                                    onClick={(event) => {
                                        event.stopPropagation(); // Prevents selection collision
                                        actions.deleteFile(doc.document_id);
                                    }}
                                    disabled={flags.isDeletingFile === doc.document_id}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "1.1rem"
                                    }}
                                >
                                    {flags.isDeletingFile === doc.document_id ? "..." : "🗑️"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};