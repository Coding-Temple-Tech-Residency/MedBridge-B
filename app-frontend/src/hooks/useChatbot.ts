import { useState } from 'react';


export const useChatbot = () => {

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [inputText, setInputText] = useState<string>("");

    const toggleOpen = () => setIsOpen((prev) => !prev)
    const clearInput = () => setInputText("");

    const handleInputChange = (value:string) => {
        setInputText(value);
    }

    return {
        isOpen,
        inputText,
        setInputText,
        toggleOpen,
        clearInput,
        handleInputChange
    }
}