'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFF7F8',
          color: '#2A1218',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <main role="alert" style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>Bookey hit a snag</h1>
          <p style={{ lineHeight: 1.6, margin: '0 0 24px', color: '#6B4A52' }}>
            Something went wrong while loading the app. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 999,
              border: 'none',
              background: '#8E1B3A',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
