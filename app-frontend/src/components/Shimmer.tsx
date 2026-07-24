export const ShimmerLoader = () => {
  return (
    <>
      {/* Embedded keyframe styles so no external CSS file is required */}
      <style>{`
        @keyframes medicalShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>

      <div style={styles.wrapper}>
        <div style={styles.shimmerBlock} />
        <div style={{ ...styles.shimmerBlock, width: '80%' }} />
        <div style={{ ...styles.shimmerBlock, width: '60%' }} />
      </div>
    </>
  );
};

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    width: '100%',
    padding: '16px',
    backgroundColor: '#F7FAFC',
    borderRadius: '12px',
    border: '1px solid #E8F4FD',
    boxSizing: 'border-box' as const,
  },
  shimmerBlock: {
    height: '20px',
    width: '100%',
    borderRadius: '6px',
    background: 'linear-gradient(90deg, #E8F4FD 0%, rgba(58, 191, 191, 0.25) 50%, #E8F4FD 100%)',
    backgroundSize: '200% 100%',
    animation: 'medicalShimmer 1.6s infinite ease-in-out',
  },
};