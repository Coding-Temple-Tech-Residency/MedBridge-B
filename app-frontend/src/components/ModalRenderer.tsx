import type { ReactNode } from "react";
import type { ModalConfig } from "../types/modal";

type ModalRendererProps = {
  onClose: () => void;
  content: ReactNode | null;
  config?: ModalConfig
};

export const ModalRenderer = ({
  onClose,
  content,
  config
}: ModalRendererProps): ReactNode => {
  if (!content) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
};
