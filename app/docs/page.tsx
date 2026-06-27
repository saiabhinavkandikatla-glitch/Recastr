import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata = {
  title: 'Documentation — Recastr',
  description: 'Learn how to use Recastr.',
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <Navbar />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '8rem 1.5rem 4rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '2rem' }}>Getting Started</h1>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'semibold', marginTop: '2rem', marginBottom: '0.5rem' }}>1. Upload a source</h2>
        <p style={{ color: '#a1a1aa', lineHeight: '1.6', marginBottom: '1.5rem' }}>Paste a YouTube URL or click the Text tab to paste a transcript,
        article, or notes. Supported: YouTube videos, podcasts (transcript),
        blog posts, documents.</p>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'semibold', marginTop: '2rem', marginBottom: '0.5rem' }}>2. Analyze</h2>
        <p style={{ color: '#a1a1aa', lineHeight: '1.6', marginBottom: '1.5rem' }}>Click Analyze Source. Recastr fetches the transcript and extracts
        the key ideas, quotes, and stories from your content.</p>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'semibold', marginTop: '2rem', marginBottom: '0.5rem' }}>3. Select platforms and tone</h2>
        <p style={{ color: '#a1a1aa', lineHeight: '1.6', marginBottom: '1.5rem' }}>Choose which platforms you want posts for: LinkedIn, X, Instagram,
        Facebook, Threads, YouTube Community. Then pick a tone: Professional,
        Casual, Storytelling, Viral, Educational, Founder, or Personal Brand.</p>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'semibold', marginTop: '2rem', marginBottom: '0.5rem' }}>4. Generate</h2>
        <p style={{ color: '#a1a1aa', lineHeight: '1.6', marginBottom: '1.5rem' }}>Click Generate Content. Posts are created for each selected platform
        in the tone you chose.</p>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'semibold', marginTop: '2rem', marginBottom: '0.5rem' }}>5. Review and copy</h2>
        <p style={{ color: '#a1a1aa', lineHeight: '1.6', marginBottom: '1.5rem' }}>Review each post. Edit if needed. Copy and publish on your platform,
        or use the Schedule Reminder feature to get an email reminder.</p>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'semibold', marginTop: '2.5rem', marginBottom: '0.5rem' }}>Need help?</h2>
        <p style={{ color: '#a1a1aa', lineHeight: '1.6' }}>Email <a href="mailto:hello@recastr.app" style={{ color: '#fff', textDecoration: 'underline' }}>hello@recastr.app</a></p>
      </div>

      <Footer />
    </main>
  )
}
