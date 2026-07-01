export const LoadingSpinner = () => {
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
    )
}