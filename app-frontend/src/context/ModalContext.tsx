import { createContext, useContext, useState, type ReactNode } from "react"
import type { ModalConfig, ModalController, ModalState } from "../types/modal";
import { ModalRenderer } from "../components/ModalRenderer";



export const ModalContext = createContext<ModalController | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {

    const [modalState, setModalState] = useState<ModalState>({
        isOpen: false,
        content: null,
        config: {}
    });


    const openModal = (component: ReactNode, config?: ModalConfig) => {

        setModalState({
            isOpen: true,
            content: component,
            config: config ?? { closable: true, size: 'md'}
        });
    };

    const closeModal = () => {
        setModalState({
            isOpen: false,
            content: null,
            config: {}
        });
    };


    return (
        <ModalContext.Provider value={{ openModal, closeModal }}>
            {children}
            {modalState.isOpen && modalState.content && (
                <ModalRenderer
                    content={modalState.content}
                    config={modalState.config}
                    onClose={closeModal}
                />
            )}

        </ModalContext.Provider>
    );


};

export const useModal = () => {
    const modalContext = useContext(ModalContext)

    if (!modalContext) {
        throw new Error("useModal must be executed within a valid ModalProvider tree.");
    }
    return modalContext;
}