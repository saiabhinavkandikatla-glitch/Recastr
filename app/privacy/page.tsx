export const metadata = {
  title: 'Privacy Policy — Recastr',
  description: 'How Recastr collects and uses your data.',
}

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1>Privacy Policy</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Last updated: June 2026
      </p>
      <h2>What we collect</h2>
      <p>We collect your email address when you sign up. We store the content
      you upload (video URLs, transcripts, pasted text) and the posts we
      generate from that content.</p>
      <h2>How we use it</h2>
      <p>We use your email to send you account-related notifications and
      email reminders for scheduled content. We use your uploaded content
      only to generate social posts on your behalf.</p>
      <h2>Third parties</h2>
      <p>We use Google OAuth for authentication. We use Supabase for database
      and auth infrastructure. We use AI APIs (NVIDIA NIM) to generate
      content — your content is sent to these services to produce posts.</p>
      <h2>Data deletion</h2>
      <p>You can delete your account and all associated data at any time from
      Settings. Email hello@recastr.app to request manual deletion.</p>
      <h2>Contact</h2>
      <p>Questions? Email hello@recastr.app</p>
    </div>
  )
}
