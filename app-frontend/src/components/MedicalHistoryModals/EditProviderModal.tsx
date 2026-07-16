import { useState } from "react";
import { useProvidersDomain } from "../../hooks/useProviderDomain";
import "./Modal.css";
import "../../main.css";

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  provider?: {
    provider_id: string;
    name: string;
    specialty: string;
    phone: string;
    email: string;
  };
}

export default function ProviderModal({
  isOpen,
  onClose,
  mode,
  provider,
}: ProviderModalProps) {
  const { actions, flags } = useProvidersDomain();

  const [name, setName] = useState(provider?.name || "");
  const [specialty, setSpecialty] = useState(provider?.specialty || "");
  const [phone, setPhone] = useState(provider?.phone || "");
  const [email, setEmail] = useState(provider?.email || "");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "add") {
      actions.registerProvider({
        name,
        specialty,
        phone,
        email,
      });
      return;
    }

    if (mode === "edit" && provider) {
      actions.updateProviderProfile(provider.provider_id, {
        name,
        specialty,
        phone,
        email,
      });
      return;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-md">
        <h2>{mode === "add" ? "Add Provider" : "Edit Provider"}</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Provider Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>

          <label>
            Specialty
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              required
            />
          </label>

          <label>
            Phone Number
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>

          <label>
            Email Address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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
