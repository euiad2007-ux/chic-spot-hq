// Shared inline styles for NOVAA emails (light, RTL, brand pink).
export const brand = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: 'Tahoma, Arial, sans-serif',
    margin: 0,
  },
  container: {
    maxWidth: 560,
    margin: '24px auto',
    background: '#fff7fb',
    borderRadius: '16px',
    padding: '28px 26px',
    textAlign: 'right' as const,
  },
  h1: {
    fontSize: '22px',
    fontWeight: 'bold' as const,
    color: '#241425',
    margin: '0 0 18px',
  },
  text: {
    fontSize: '15px',
    color: '#55465a',
    lineHeight: '26px',
    margin: '0 0 22px',
  },
  code: {
    fontFamily: 'Courier, monospace',
    fontSize: '26px',
    fontWeight: 'bold' as const,
    letterSpacing: '4px',
    color: '#be185d',
    margin: '0 0 24px',
    textAlign: 'center' as const,
  },
  button: {
    backgroundColor: '#be185d',
    color: '#ffffff',
    fontSize: '15px',
    borderRadius: '12px',
    padding: '12px 24px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  footer: {
    fontSize: '12px',
    color: '#8b7c91',
    margin: '28px 0 0',
  },
}
