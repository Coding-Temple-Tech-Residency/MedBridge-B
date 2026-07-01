import type { ReactNode } from "react";

type ModalRendererProps = {
  onClose: () => void;
  content: ReactNode | null;
};

export const ModalRenderer = ({
  onClose,
  content,
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
