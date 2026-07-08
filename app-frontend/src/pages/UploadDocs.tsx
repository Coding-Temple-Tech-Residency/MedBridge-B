// src/pages/UploadDocs.tsx
import { useState, type ReactNode } from "react";
import "../main.css";
import { UploadDocuments } from "../components/UploadDocument";
import { DocumentSummaryPanel } from "../components/DocumentSummaryPanel";
import { useDocumentsDomain } from "../hooks/useDocumentsDomain";

export const UploadDocs = (): ReactNode => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const { data, flags, actions, viewConfigs } = useDocumentsDomain(selectedDocumentId || undefined);

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
          onSelectDocument={setSelectedDocumentId}
        />
      </div>


      <div className="summary-side-column">
        <DocumentSummaryPanel
          selectedDocumentId={selectedDocumentId}
          activeSummary={data.activeSummary}
          isProcessing={flags.isProcessingFile}
          isEmpty={flags.isSummaryEmpty}
          viewConfigs={viewConfigs}
          onRegenerate={actions.reconstructSummary}
        />
      </div>

    </div>
  );
};