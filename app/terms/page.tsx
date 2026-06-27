export const metadata = {
  title: 'Terms of Service — Recastr',
  description: 'Terms governing your use of Recastr.',
}

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1>Terms of Service</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Last updated: June 2026
      </p>
      <h2>Acceptance</h2>
      <p>By using Recastr you agree to these terms. If you do not agree,
      do not use the service.</p>
      <h2>What Recastr does</h2>
      <p>Recastr generates social media posts from content you provide.
      You are responsible for reviewing all generated content before
      publishing it.</p>
      <h2>Your content</h2>
      <p>You own the content you upload. You grant Recastr a limited license
      to process that content to generate posts on your behalf.</p>
      <h2>Acceptable use</h2>
      <p>Do not use Recastr to generate spam, misinformation, or content
      that violates platform terms of service. Do not upload content you
      do not have rights to.</p>
      <h2>Service availability</h2>
      <p>Recastr is provided as-is. We do not guarantee uptime or that
      generated content will meet your expectations.</p>
      <h2>Contact</h2>
      <p>Questions? Email hello@recastr.app</p>
    </div>
  )
}
