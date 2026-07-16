import { useState } from "react";
import { useUserProfileDomain } from "../../hooks/useUserProfileDomain";
import "./Modal.css";
import "../../main.css";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: {
    full_name?: string;
    email?: string;
    preferred_language?: string;
    explanation_level?: string;
  };
}

export default function EditProfileModal({
  isOpen,
  onClose,
  profile,
}: EditProfileModalProps) {
  // ✔ No user_id argument — backend extracts user from JWT
  const { actions, flags } = useUserProfileDomain();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [email, setEmail] = useState(profile?.email ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState(
    profile?.preferred_language ?? "English",
  );
  const [explanationLevel, setExplanationLevel] = useState(
    profile?.explanation_level ?? "simple",
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    actions.updateProfile(
      {
        full_name: fullName,
        email,
        preferred_language: preferredLanguage,
        explanation_level: explanationLevel,
      }
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-md">
        <h2>Edit Profile</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Full Name
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
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

          <label>
            Preferred Language
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
            >
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="Tagalog">Tagalog</option>
              <option value="Chinese">Chinese</option>
            </select>
          </label>

          <label>
            Explanation Level
            <select
              value={explanationLevel}
              onChange={(e) => setExplanationLevel(e.target.value)}
            >
              <option value="simple">Plain</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>

          <button type="submit" disabled={flags.isUpdating}>
            {flags.isUpdating ? "Saving..." : "Save Changes"}
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
