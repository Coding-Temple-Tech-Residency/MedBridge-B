import type { ModalRendererProp } from "../types/modal";

export const ModalRenderer = ({
    onClose,
    content,
}: ModalRendererProp) => {

    if (!content) return null;



    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 9999
            }}
            onClick={onClose}
        >
            <div
                style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {content}
            </div>
        </div>
    )
};