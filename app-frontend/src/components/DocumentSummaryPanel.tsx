import type { ReactNode } from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import { EmptyState } from "./EmptyState";


interface DocumentSummaryPanelProps {
    selectedDocumentId: string | null;
    activeSummary: { summary_text?: string } | null | undefined;
    isProcessing: boolean;
    isEmpty: boolean;
    viewConfigs: any;
    onRegenerate: () => void;
}

export const DocumentSummaryPanel = ({
    selectedDocumentId,
    activeSummary,
    isProcessing,
    isEmpty,
    viewConfigs,
    onRegenerate
}: DocumentSummaryPanelProps): ReactNode => {


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
                <span style={{ fontSize: "3rem", marginBottom: "16px" }}>{viewConfigs.emptySummary.icon}</span>
                <h3>Select a Document</h3>
                <p style={{ textAlign: "center", maxWidth: "300px", margin: "8px 0 0 0", fontSize: "0.95rem" }}>
                    Click on any uploaded file from your vault list to review its AI summary breakdown.
                </p>
            </div>
        );
    }

    if (isProcessing) return <LoadingSpinner />
    if (isEmpty || !activeSummary?.summary_text) {
        return <EmptyState title="No summary available." description="No Summary available." onAction={onRegenerate} />
    }


    return (
        <div style={panelStyle}>
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "16px", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>{viewConfigs.documentSummary.icon}</span>
                    {viewConfigs.documentSummary.title}
                </h2>
                <p style={{ margin: "6px 0 0 0", color: "#718096", fontSize: "0.9rem" }}>
                    {viewConfigs.documentSummary.description}
                </p>
            </div>

            <div
                className="summary-content"
                style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.6",
                    color: "#2d3748",
                    fontSize: "1.05rem"
                }}
            >
                {activeSummary.summary_text}
            </div>
        </div>
    );
};