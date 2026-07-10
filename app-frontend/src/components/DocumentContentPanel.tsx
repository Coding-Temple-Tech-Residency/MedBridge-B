import type { ReactNode } from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import { EmptyState } from "./EmptyState";


interface DocumentContentPanelProps {
    selectedDocumentId: string | null;
    contentText: string | null | undefined;
    isProcessing: boolean;
    isEmpty: boolean;
    title: string;
    description: string;
    icon: string;
    emptyIcon: string;
    emptyTitle?: string;
    onRegenerate?: () => void; 
}



export const DocumentContentPanel = ({
    selectedDocumentId,
    contentText,
    isProcessing,
    isEmpty,
    title,
    description,
    icon,
    emptyIcon,
    emptyTitle = "No content available.",
    onRegenerate
}: DocumentContentPanelProps): ReactNode => {

    const panelStyle: React.CSSProperties = {
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "32px",
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
        minHeight: "400px",
        display: "flex",
        flexDirection: "column",
    };

   
    if (!selectedDocumentId) {
        return (
            <div style={{ ...panelStyle, justifyContent: "center", alignItems: "center", color: "#a0aec0" }}>
                <span style={{ fontSize: "3rem", marginBottom: "16px" }}>{emptyIcon}</span>
                <h3>Select a Document</h3>
                <p style={{ textAlign: "center", maxWidth: "300px", margin: "8px 0 0 0", fontSize: "0.95rem" }}>
                    Click on any uploaded file from your vault list to review its contents.
                </p>
            </div>
        );
    }

  
    if (isProcessing) return <LoadingSpinner />;

   
    if (isEmpty || !contentText) {
        return (
            <EmptyState 
                title={emptyTitle} 
                description="We couldn't locate any data record contents for this file." 
                onAction={onRegenerate}
            />
        );
    }

  
    return (
        <div style={panelStyle}>
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "16px", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>{icon}</span>
                    {title}
                </h2>
                <p style={{ margin: "6px 0 0 0", color: "#718096", fontSize: "0.9rem" }}>
                    {description}
                </p>
            </div>

            <div
                className="workspace-rendered-content"
                style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.6",
                    color: "#2d3748",
                    fontSize: "1.05rem",
                    maxHeight: "500px",
                    overflowY: "auto"
                }}
            >
                {contentText}
            </div>
        </div>
    );
};