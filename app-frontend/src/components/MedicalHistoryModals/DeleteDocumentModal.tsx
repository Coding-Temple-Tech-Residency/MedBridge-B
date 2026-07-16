// src/components/MedicalHistoryModals/DeleteDocumentModal.tsx
import type { ReactNode } from "react";
import "./Modal.css";
import "../../main.css";

interface DeleteDocumentModalProps {
  documentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteDocumentModal = ({
  documentName,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteDocumentModalProps): ReactNode => {
  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2 className="modal-title">Delete Document</h2>

        <p className="modal-text">
          Are you sure you want to delete <strong>{documentName}</strong>? This
          action cannot be undone.
        </p>

        <div className="modal-actions">
          <button
            className="modal-cancel"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>

          <button
            className="modal-delete"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
