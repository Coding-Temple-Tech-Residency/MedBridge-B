import type { ChatResponse } from "../types/documents";




export interface FloatingTriggerProp {
    onClick: () => void;
}


export const FloatingTrigger = ({ onClick }: FloatingTriggerProp) => {
    return (
        <button
            onClick={onClick}
            aria-label="Open Chat"
        >
            💬
        </button>
    );
};


interface ChatRoundRowProps {
    chatRound: ChatResponse;
}


export const ChatRoundRow = ({ chatRound }: ChatRoundRowProps) => {
    return (
        <>
            <div className="chat-question">
                {chatRound.question}
            </div>
            <div className="chat-answer">
                {chatRound.answer}
            </div>
        </>
    )
}

export interface ChatboxUIProps {
    history: ChatResponse[];
    inputText: string;
    isStreaming: boolean;
    streamingText: string;
    onInputChange: (val: string) => void;
    onSubmit: (e: React.SubmitEvent) => void;
    onClose: () => void;
}



export const ChatboxUI = ({
    history,
    inputText,
    isStreaming,
    streamingText,
    onInputChange,
    onSubmit,
    onClose
}: ChatboxUIProps) => {

    return (
        <div className="chatbot-container">

            <div className="chatbot-header">
                <h3 className="chat-title">Document AI Assistant</h3>
                <p className="chat-description">Ask Questions about your Medical Documents.</p>
            </div>
            <button
                onClick={onClose}
                className="close-button"
                aria-label="Close Chat"
            >
                ❌
            </button>

            <div className="chat-body">
                {history.length === 0 && !isStreaming && (
                    <div className="empty-chat">
                        <h4>No Conversation Yet.</h4>
                        <p>Ask a question about your documents to start analyzing with AI.</p>

                    </div>
                )}
              {history.map((message: any) => (
                    <div 
                        key={message.id || message.created_at} 
                        className={`chat-bubble ${message.role === 'user' ? 'chat-question' : 'chat-answer'}`}
                    >
                        {message.content}
                    </div>
                ))}

                {isStreaming && streamingText && (
                    <div className="streaming">
                        {streamingText}
                    </div>
                )}

            </div>

            <form onSubmit={onSubmit} className="form-input">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder="Type your question ..."
                    disabled={isStreaming}
                />
                <button
                    type="submit"
                    disabled={!inputText.trim() || isStreaming}
                >
                    Send
                </button>
            </form>

        </div>
    )
}