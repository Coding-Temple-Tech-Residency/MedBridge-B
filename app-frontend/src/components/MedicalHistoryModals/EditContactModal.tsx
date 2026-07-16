// src/components/MedicalHistoryModals/EditContactModal.tsx
import { useState } from "react";
import { useTrustedContactsDomain } from "../../hooks/useTrustedContactsDomain";
import "./Modal.css";
import "../../main.css";

interface TrustedContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  contact?: {
    contact_id: string;
    contact_name: string;
    contact_email: string;
    access_level: number;
  };
}

export default function TrustedContactModal({
  isOpen,
  onClose,
  mode,
  contact,
}: TrustedContactModalProps) {
  const { actions, flags } = useTrustedContactsDomain();

  const [name, setName] = useState(contact?.contact_name || "");
  const [email, setEmail] = useState(contact?.contact_email || "");
  const [accessLevel, setAccessLevel] = useState(
    contact?.access_level?.toString() || "0",
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "add") {
      actions.addContact({
        contact_name: name,
        contact_email: email,
        access_level: Number(accessLevel),
      });
      return;
    }

    if (mode === "edit" && contact) {
      actions.updateContactPermissions(contact.contact_id, {
        contact_name: name,
        contact_email: email,
        access_level: Number(accessLevel),
      });
      return;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-md">
        <h2>{mode === "add" ? "Add Trusted Contact" : "Edit Contact"}</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Contact Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label>
            Contact Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Access Level
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
            >
              <option value="0">Basic Access</option>
              <option value="1">Full Access</option>
            </select>
          </label>

          <button type="submit" disabled={!!flags.isUpdating}>
            {flags.isUpdating ? "Saving..." : "Save"}
          </button>

          {flags.hasError && (
            <p className="modal-error">{flags.errorMessage}</p>
          )}
        </form>

        <button className="modal-cancel" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
