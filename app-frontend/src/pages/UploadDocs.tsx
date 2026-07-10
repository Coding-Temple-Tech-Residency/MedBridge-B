
import { useState, type ReactNode } from "react";
import "../main.css";
import { localPdfCache, UploadDocuments } from "../components/UploadDocument";
import { DocumentContentPanel } from "../components/DocumentContentPanel";
import { useDocumentsDomain } from "../hooks/useDocumentsDomain";
import { LoadingSpinner } from "../components/LoadingSpinner";

export const UploadDocs = (): ReactNode => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<"summary" | "pdf">("summary");
  const { data, flags, actions, viewConfigs } = useDocumentsDomain(selectedDocumentId || undefined);

  const handleDocumentSelection = (id: string) => {
    setSelectedDocumentId(id);
    setRightPanelTab("summary");
  };


  const activeFileName = data.activeDocument?.file_name;
  const documentFileUrl = activeFileName ? localPdfCache[activeFileName] : null;

  return (
    <div
      className="grid-container"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "32px",
        padding: "24px",
        maxWidth: "1400px",
        margin: "0 auto",
        alignItems: "start"
      }}
    >

      <div className="upload-side-column">
        <UploadDocuments
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={handleDocumentSelection}
        />
      </div>


      <div className="summary-side-column">
        {!selectedDocumentId ? (
          <div style={{ border: "1px dashed #e2e8f0", padding: "40px", textAlign: "center", borderRadius: "12px" }}>
            <h3>No Document is Active</h3>
            <p style={{ color: "#718096" }}>Upload a brand new File or select an existing one from your vault.</p>
          </div>
        ) : (
          <div className="active-workspace-wrapper" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            <div className="tab-navigation" style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setRightPanelTab("summary")}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  border: "1px solid #e2e8f0",
                  backgroundColor: rightPanelTab === "summary" ? "#3182ce" : "#ffffff",
                  color: rightPanelTab === "summary" ? "#ffffff" : "#2d3748",
                  fontWeight: "600",
                  transition: "all 0.2s"
                }}
              >
                AI Summary
              </button>
              <button
                onClick={() => setRightPanelTab("pdf")}
                style={{
                  padding: "10px 20px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  border: "1px solid #e2e8f0",
                  backgroundColor: rightPanelTab === "pdf" ? "#3182ce" : "#ffffff",
                  color: rightPanelTab === "pdf" ? "#ffffff" : "#2d3748",
                  fontWeight: "600",
                  transition: "all 0.2s"
                }}
              >
                Original PDF
              </button>
            </div>

            {rightPanelTab === "summary" ? (
              <DocumentContentPanel
                selectedDocumentId={selectedDocumentId}
                contentText={data.activeSummary?.summary_text}
                isProcessing={flags.isSummaryLoading}
                isEmpty={flags.isSummaryEmpty}
                icon={viewConfigs.documentSummary.icon}
                title={viewConfigs.documentSummary.title}
                description={viewConfigs.documentSummary.description}
                emptyIcon={viewConfigs.emptySummary.icon}
                onRegenerate={actions.reconstructSummary}
              />
            ) : (
              <div
                className="pdf-viewer-container"
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                  height: "600px",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "12px" }}>
                  <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", fontSize: "1.5rem" }}>
                    <span>📄</span>
                    Source Document Archive
                  </h2>
                  <p style={{ margin: "4px 0 0 0", color: "#718096", fontSize: "0.85rem" }}>
                    Reviewing the original secure file transmission.
                  </p>
                </div>

                {flags.isDocumentLoading ? (
                  <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <LoadingSpinner />
                  </div>
                ) : documentFileUrl ? (

                  <iframe
                    src={documentFileUrl}
                    title="Uploaded Document Preview"
                    width="100%"
                    height="100%"
                    style={{ border: "none", borderRadius: "6px", backgroundColor: "#f7fafc" }}
                  />
                ) : (

                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "#4a5568",
                      textAlign: "center",
                      backgroundColor: "#f7fafc",
                      borderRadius: "8px",
                      padding: "24px"
                    }}
                  >
                    <span style={{ fontSize: "2.2rem", marginBottom: "8px" }}>🔒</span>
                    <h4 style={{ margin: "0 0 4px 0", color: "#2d3748" }}>Historical Medical Record Restricted</h4>
                    <p style={{ maxWidth: "340px", fontSize: "0.85rem", color: "#718096", margin: 0, lineHeight: "1.4" }}>
                      To strictly protect patient data privacy and ensure PHI security standards, older files can only be accessed via the authorized medical summary extraction.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};