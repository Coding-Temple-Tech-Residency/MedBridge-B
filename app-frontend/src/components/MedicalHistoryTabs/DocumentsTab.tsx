import type { DocumentResponse } from "../../types/documents";
import { useGetDocumentFileUrl } from "../../api/documents.queries";
import { useNavigate } from "react-router";

interface DocumentsTabProps {
  documents: DocumentResponse[];
  onDeleteDocument: (id: string) => void;
}

export default function DocumentsTab({
  documents,
  onDeleteDocument,
}: DocumentsTabProps) {
  const { mutate: getFileUrl } = useGetDocumentFileUrl();
  const navigate = useNavigate();

  const handleOpenPdf = (document_id: string) => {
    getFileUrl(document_id, {
      onSuccess: (data) => {
        window.open(data.url, "_blank", "noopener,noreferrer");
      },
    });
  };

  const handleOpenSummary = (document_id: string) => {
    navigate(`/upload-docs?doc=${document_id}`);
  };

  const sortedDocuments = [...documents].sort(
    (a, b) =>
      new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
  );

  return (
    <div>
      <h2>Uploaded Documents</h2>

      {sortedDocuments.length ? (
        sortedDocuments.map((doc) => (
          <div key={doc.document_id} className="list-row">
            <span>
              {doc.file_name} — {doc.status} (
              {new Date(doc.uploaded_at).toLocaleDateString()})
            </span>

            <div className="doc-actions">
              <button onClick={() => handleOpenPdf(doc.document_id)}>
                View PDF
              </button>

              <button onClick={() => handleOpenSummary(doc.document_id)}>
                View Summary
              </button>

              <button
                className="modal-delete"
                onClick={() => onDeleteDocument(doc.document_id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      ) : (
        <p>No documents uploaded yet.</p>
      )}
    </div>
  );
}
