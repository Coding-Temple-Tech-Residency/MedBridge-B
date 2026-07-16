// src/components/MedicalHistoryModals/EditSettingsModal.tsx
import {  useState } from "react";
import { useUserSettingsDomain } from "../../hooks/useUserSettingsDomain";
import "./Modal.css";
import "../../main.css";

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: {
    allow_trusted_contacts: boolean;
    allow_mychart_integration: boolean;
    enable_reminders: boolean;
  };
}

export default function UserSettingsModal({
  isOpen,
  onClose,
  settings,
}: UserSettingsModalProps) {
  const { actions, flags } = useUserSettingsDomain();

  const [allowTrustedContacts, setAllowTrustedContacts] = useState(
    settings?.allow_trusted_contacts ?? false,
  );
  const [allowMyChartIntegration, setAllowMyChartIntegration] = useState(
    settings?.allow_mychart_integration ?? false,
  );
  const [enableReminders, setEnableReminders] = useState(
    settings?.enable_reminders ?? false,
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    actions.saveSettings({
      allow_trusted_contacts: allowTrustedContacts,
      allow_mychart_integration: allowMyChartIntegration,
      enable_reminders: enableReminders,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container modal-md">
        <h2>User Settings</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <label className="toggle-label">
            Allow Trusted Contacts
            <input
              type="checkbox"
              checked={allowTrustedContacts}
              onChange={(e) => setAllowTrustedContacts(e.target.checked)}
            />
          </label>

          <label className="toggle-label">
            Allow MyChart Integration
            <input
              type="checkbox"
              checked={allowMyChartIntegration}
              onChange={(e) => setAllowMyChartIntegration(e.target.checked)}
            />
          </label>

          <label className="toggle-label">
            Enable Reminders
            <input
              type="checkbox"
              checked={enableReminders}
              onChange={(e) => setEnableReminders(e.target.checked)}
            />
          </label>

          <button type="submit" disabled={!!flags.isUpdating}>
            {flags.isUpdating ? "Saving..." : "Save Settings"}
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
