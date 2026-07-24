export const LoadingSpinner = () => {
    return (
        <div style={styles.container}>
            <div style={styles.spinnerWrapper}>
                <div style={styles.glow} />
                <div style={styles.spinner} />
            </div>
            <p style={styles.text}>Loading workspace...</p>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        backgroundColor: '#F7FAFC',
    },
    spinnerWrapper: {
        position: 'relative' as const,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute' as const,
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#3ABFBF',
        opacity: 0.25,
        filter: 'blur(8px)',
    },
    spinner: {
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '4px solid #E8F4FD',
        borderTopColor: '#2D7DD2',
        animation: 'spin 0.8s linear infinite',
    },
    text: {
        margin: 0,
        fontSize: '0.875rem',
        fontWeight: 600,
        color: '#1B3A5C',
        letterSpacing: '0.025em',
    },
};