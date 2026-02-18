export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent-500)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}
