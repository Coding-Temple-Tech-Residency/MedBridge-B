
export interface ModalConfig {
    closable?: boolean;
    title?: string;
    size?: "sm" | "md" | "lg";
}


export interface ModalState {
    isOpen: boolean;
    content: React.ReactNode | null;
    config?: ModalConfig;
}


export interface ModalController {
    openModal: (content:any, config?:any) => void

    closeModal: () => void;

}

export interface ModalRendererProp {
    content: React.ReactNode | null;
    onClose: () => void; 
    config?: ModalConfig;
}

