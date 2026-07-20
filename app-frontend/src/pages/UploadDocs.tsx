import { useState, type ReactNode } from "react";
import { ChatbotWidget } from "../components/ChatbotWidget";
import { DocumentContentPanel } from "../components/DocumentContentPanel";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { localPdfCache, UploadDocuments } from "../components/UploadDocument";
import { useModal } from "../context/ModalContext";
import { useDocumentsDomain } from "../hooks/useDocumentsDomain";
import "./UploadDocs.css";
import { ExportDocument } from "../components/ExportDocument";


export const UploadDocs = (): ReactNode => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<"summary" | "pdf">("summary");


  const { openModal, closeModal } = useModal();

  const { data, flags, actions, viewConfigs } = useDocumentsDomain(
    selectedDocumentId || undefined,
  );

  const handleDocumentSelection = (id: string) => {
    setSelectedDocumentId(id);
    setRightPanelTab("summary");
  };

  const handleDocumentExport = () => {
    if (!selectedDocumentId) return;

    openModal(
      <ExportDocument
        id={selectedDocumentId}
        document_name={activeFileName || "Unnamed Document"}
        ai_summary={data.activeSummary?.summary_text || ""}
        document_file_url={documentFileUrl || ""} 
        onClose={closeModal}
        onSubmit={(payload) => {
          console.log("Transmission Payload Compiled:", payload)
          closeModal()
        }}
      />)
  }



  const activeFileName = data.activeDocument?.file_name;
  const documentFileUrl = activeFileName ? localPdfCache[activeFileName] : null;

  return (
    <div className="upload-docs-container">
      {/* LEFT: Upload / document list */}
      <div className="upload-side-column">
        <UploadDocuments
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={handleDocumentSelection}
        />
      </div>

      {/* RIGHT: Summary/PDF viewer + chat, stacked together */}
      <div className="display-side-column">
        {!selectedDocumentId ? (
          <div className="empty-workspace-state">
            <h3>No Document is Active</h3>
            <p>Upload a brand new File or select an existing one from your vault.</p>
          </div>
        ) : (
          <div className="active-workspace-wrapper">
            <div className="tab-navigation">
              <button
                onClick={() => setRightPanelTab("summary")}
                className={`tab-button ${rightPanelTab === "summary" ? "active" : ""}`}
              >
                AI Summary
              </button>
              <button
                onClick={() => setRightPanelTab("pdf")}
                className={`tab-button ${rightPanelTab === "pdf" ? "active" : ""}`}
              >
                Original PDF
              </button>

              <button
                className="export-button"
                onClick={handleDocumentExport}
              >
                Export Summary & Document
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
              <div className="pdf-viewer-container">
                <div className="pdf-viewer-header">
                  <h2>
                    <span>📄</span>
                    Source Document Archive
                  </h2>
                  <p>Reviewing the original secure file transmission.</p>
                </div>

                {flags.isDocumentLoading ? (
                  <div className="pdf-loading-container">
                    <LoadingSpinner />
                  </div>
                ) : documentFileUrl ? (
                  <iframe
                    src={documentFileUrl}
                    title="Uploaded Document Preview"
                    className="pdf-iframe"
                  />
                ) : (
                  <div className="pdf-restricted-container">
                    <span className="restricted-icon">🔒</span>
                    <h4>Historical Medical Record Restricted</h4>
                    <p>
                      To strictly protect patient data privacy and ensure PHI
                      security standards, older files can only be accessed via
                      the authorized medical summary extraction.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat now lives inside the right column, so it stacks below the viewer */}
        <div className="chat-widget-container">
          <ChatbotWidget document_id={selectedDocumentId ?? undefined} />
        </div>
      </div>
    </div>
  );
};