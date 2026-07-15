import { useState, type ReactNode } from "react";
import "../main.css";
import "./MedicalHistory.css";

import {
  localPdfCache,
  UploadDocuments,
} from "../components/UploadDocument";
import { DocumentContentPanel } from "../components/DocumentContentPanel";
import { LabResultsVisualization } from "../components/LabResultsVisualization";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useDocumentsDomain } from "../hooks/useDocumentsDomain";

type RightPanelTab = "summary" | "labs" | "pdf";

export const UploadDocs = (): ReactNode => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [rightPanelTab, setRightPanelTab] =
    useState<RightPanelTab>("summary");

  const { data, flags, actions, viewConfigs } = useDocumentsDomain(
    selectedDocumentId || undefined,
  );

  const handleDocumentSelection = (id: string) => {
    setSelectedDocumentId(id);
    setRightPanelTab("summary");
  };

  const activeFileName = data.activeDocument?.file_name;
  const documentFileUrl = activeFileName
    ? localPdfCache[activeFileName]
    : null;

  const labResults = data.activeDocument?.lab_results ?? [];

  const tabStyle = (tab: RightPanelTab): React.CSSProperties => ({
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    border: "1px solid #e2e8f0",
    backgroundColor: rightPanelTab === tab ? "#3182ce" : "#ffffff",
    color: rightPanelTab === tab ? "#ffffff" : "#2d3748",
    fontWeight: "600",
    transition: "all 0.2s",
  });

  return (
    <div
      className="grid-container"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(300px, 0.8fr) minmax(0, 1.2fr)",
        gap: "32px",
        padding: "24px",
        maxWidth: "1500px",
        margin: "0 auto",
        alignItems: "start",
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
          <div
            style={{
              border: "1px dashed #e2e8f0",
              padding: "40px",
              textAlign: "center",
              borderRadius: "12px",
              backgroundColor: "#ffffff",
            }}
          >
            <h3>No document selected</h3>
            <p style={{ color: "#718096" }}>
              Upload a new file or select an existing record from your document
              vault.
            </p>
          </div>
        ) : (
          <div
            className="active-workspace-wrapper"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div
              className="tab-navigation"
              role="tablist"
              aria-label="Document views"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={rightPanelTab === "summary"}
                onClick={() => setRightPanelTab("summary")}
                style={tabStyle("summary")}
              >
                AI Summary
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={rightPanelTab === "labs"}
                onClick={() => setRightPanelTab("labs")}
                style={tabStyle("labs")}
              >
                Lab Results
                {labResults.length > 0 ? ` (${labResults.length})` : ""}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={rightPanelTab === "pdf"}
                onClick={() => setRightPanelTab("pdf")}
                style={tabStyle("pdf")}
              >
                Original PDF
              </button>
            </div>

            {rightPanelTab === "summary" && (
              <DocumentContentPanel
                selectedDocumentId={selectedDocumentId}
                contentText={data.activeSummary?.summary_text}
                isProcessing={flags.isSummaryLoading}
                isEmpty={flags.isSummaryEmpty}
                icon={viewConfigs.documentSummary.icon}
                title={viewConfigs.documentSummary.title}
                description={viewConfigs.documentSummary.description}
                emptyIcon="??"
                onRegenerate={actions.reconstructSummary}
              />
            )}

            {rightPanelTab === "labs" && (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "24px",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                }}
              >
                {flags.isDocumentLoading ? (
                  <LoadingSpinner />
                ) : (
                  <LabResultsVisualization labResults={labResults} />
                )}
              </div>
            )}

            {rightPanelTab === "pdf" && (
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
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      fontSize: "1.5rem",
                    }}
                  >
                    <span aria-hidden="true">??</span>
                    Source document
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "#718096",
                      fontSize: "0.85rem",
                    }}
                  >
                    Review the original uploaded file.
                  </p>
                </div>

                {flags.isDocumentLoading ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <LoadingSpinner />
                  </div>
                ) : documentFileUrl ? (
                  <iframe
                    src={documentFileUrl}
                    title="Uploaded document preview"
                    width="100%"
                    height="100%"
                    style={{
                      border: "none",
                      borderRadius: "6px",
                      backgroundColor: "#f7fafc",
                    }}
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
                      padding: "24px",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ fontSize: "2.2rem", marginBottom: "8px" }}
                    >
                      ??
                    </span>
                    <h4 style={{ margin: "0 0 4px", color: "#2d3748" }}>
                      Original file preview unavailable
                    </h4>
                    <p
                      style={{
                        maxWidth: "360px",
                        fontSize: "0.85rem",
                        color: "#718096",
                        margin: 0,
                        lineHeight: "1.4",
                      }}
                    >
                      Files uploaded during an earlier browser session are not
                      currently available in the local preview. The summary and
                      structured clinical data remain available.
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
