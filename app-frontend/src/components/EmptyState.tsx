
export interface EmptyStateProps {
    title: string;
    description: string;
    icon?: string;
    onAction?: () => void
}


export function EmptyState({ title, description, icon="🫙" }: EmptyStateProps) {
    return (
        <div className="empty-state">
           <h1 className='empty-title'> {title} {icon} </h1>
           <p>{description}</p>
        </div>
    );
}