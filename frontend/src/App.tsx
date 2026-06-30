import { AuthContainer } from "./components/AuthContainer";
import { useModal } from "./context/ModalContext";

export default function App() {
  const { openModal } = useModal();
 

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Welcome to the Platform</h1>
      </header>

      <main style={styles.actionRow}>
        <button
          style={styles.loginBtn}
          onClick={() => openModal(<AuthContainer />)}
        >
          🔑 Sign In
        </button>
      </main>
    </div>
  );
}


const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "32px",
    maxWidth: "500px",
  },
  title: {
    fontSize: "28px",
    color: "#111827",
    margin: "0 0 12px 0",
  },
  subtitle: {
    fontSize: "15px",
    color: "#4b5563",
    lineHeight: "1.5",
    margin: 0,
  },
  actionRow: {
    display: "flex",
    gap: "16px",
  },
  loginBtn: {
    padding: "12px 24px",
    fontSize: "15px",
    fontWeight: 600,
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  registerBtn: {
    padding: "12px 24px",
    fontSize: "15px",
    fontWeight: 600,
    backgroundColor: "#111827",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  }
};