export const metadata = {
  title: 'Contact — Recastr',
  description: 'Get in touch with the Recastr team.',
}

export default function ContactPage() {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '4rem 1.5rem',
      textAlign: 'center' }}>
      <h1>Contact</h1>
      <p style={{ color: 'var(--text-secondary)', margin: '1rem 0 2rem' }}>
        Have a question or need help? Reach out.
      </p>
      <a
        href="mailto:hello@recastr.app"
        style={{
          display: 'inline-block',
          padding: '12px 28px',
          background: 'var(--text-primary)',
          color: 'var(--surface-2)',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        hello@recastr.app
      </a>
      <p style={{ color: 'var(--text-secondary)', marginTop: '2rem',
        fontSize: '14px' }}>
        We usually respond within 24 hours.
      </p>
    </div>
  )
}
