import { SignIn } from '@clerk/clerk-react'

export function LoginScreen() {
  return (
    <div style={styles.wrapper}>
      {/* Background */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.orb3} />
      <div style={styles.grid} />
      <div style={styles.vignette} />
      <div style={styles.noise} />

      {/* Single centered card */}
      <div style={styles.center}>
        <div style={styles.card}>
          {/* Glow behind logo */}
          <div style={styles.logoGlow} />

          <img
            src="/Escalamos.io. blanco (2).png"
            alt="Escalamos"
            style={styles.logo}
          />

          <p style={styles.tagline}>
            Transformando negocios en centros de inteligencia
          </p>

          <div style={styles.divider} />

          <SignIn
            appearance={{
              layout: { showOptionalFields: false },
              variables: {
                colorPrimary: '#3B82F6',
                colorBackground: 'transparent',
                colorText: '#ffffff',
                colorTextSecondary: 'rgba(255,255,255,0.5)',
                colorInputBackground: 'rgba(255,255,255,0.06)',
                colorInputText: '#ffffff',
                borderRadius: '10px',
                fontFamily: "'Manrope', sans-serif",
              },
              elements: {
                rootBox: { width: '100%' },
                card: {
                  background: 'transparent',
                  boxShadow: 'none',
                  border: 'none',
                  padding: 0,
                  width: '100%',
                },
                // Hide Clerk's own header — we use our logo + tagline
                headerTitle: { display: 'none' },
                headerSubtitle: { display: 'none' },
                logoBox: { display: 'none' },
                header: { display: 'none' },
                // Inputs
                formFieldLabel: { display: 'none' },
                formFieldLabelRow: { display: 'none' },
                formFieldInput: {
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 14,
                  borderRadius: 10,
                  padding: '12px 16px',
                },
                formField: {
                  marginBottom: 16,
                },
                // Button — gris sutil como Arko
                formButtonPrimary: {
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  borderRadius: 10,
                  padding: '12px 0',
                  textTransform: 'none',
                  letterSpacing: 0,
                  boxShadow: 'none',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                },
                form: {
                  width: '100%',
                  overflow: 'visible',
                },
                main: {
                  width: '100%',
                  overflow: 'visible',
                },
                cardBox: {
                  width: '100%',
                  overflow: 'visible',
                },
                // Hide footer
                footerAction: { display: 'none' },
                footer: { display: 'none' },
                // Links
                formFieldAction: {
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 12,
                },
                // Social buttons
                dividerLine: { background: 'rgba(255,255,255,0.08)' },
                dividerText: {
                  color: 'rgba(255,255,255,0.3)',
                  fontFamily: "'Manrope', sans-serif",
                },
                socialButtonsBlockButton: {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontFamily: "'Manrope', sans-serif",
                  borderRadius: 10,
                },
                identityPreview: {
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                },
                identityPreviewText: { color: '#fff' },
                identityPreviewEditButton: { color: '#3B82F6' },
                alertText: { color: '#fff' },
                formResendCodeLink: { color: '#3B82F6' },
              },
            }}
          />
        </div>

        <p style={styles.copy}>&copy; {new Date().getFullYear()} Escalamos.io</p>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
    background: 'radial-gradient(ellipse at top, #0a1226 0%, #060912 45%, #040509 100%)',
  },
  orb1: {
    position: 'absolute',
    width: 800,
    height: 800,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.32) 0%, transparent 65%)',
    top: '-18%',
    right: '-15%',
    filter: 'blur(90px)',
    animation: 'float1 15s ease-in-out infinite',
  },
  orb2: {
    position: 'absolute',
    width: 650,
    height: 650,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(37,99,235,0.28) 0%, transparent 65%)',
    bottom: '-12%',
    left: '-12%',
    filter: 'blur(90px)',
    animation: 'float2 18s ease-in-out infinite',
  },
  orb3: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)',
    top: '35%',
    left: '40%',
    filter: 'blur(100px)',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
    `,
    backgroundSize: '64px 64px',
    maskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 15%, transparent 75%)',
    WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 50%, black 15%, transparent 75%)',
  },
  vignette: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
    pointerEvents: 'none',
  },
  noise: {
    position: 'absolute',
    inset: 0,
    opacity: 0.35,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
    pointerEvents: 'none',
  },
  center: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 32,
  },
  card: {
    position: 'relative',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 24,
    padding: '48px 48px 40px',
    maxWidth: 420,
    width: '100%',
    backdropFilter: 'blur(24px)',
    boxShadow: '0 0 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  logoGlow: {
    position: 'absolute',
    top: 25,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 300,
    height: 100,
    background: 'radial-gradient(ellipse 100% 100%, rgba(255,255,255,0.06) 0%, transparent 60%)',
    filter: 'blur(25px)',
    pointerEvents: 'none',
  },
  logo: {
    display: 'block',
    margin: '0 auto 14px',
    height: 32,
    position: 'relative',
    maskImage: 'linear-gradient(to bottom, white 40%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to bottom, white 40%, transparent 100%)',
  },
  tagline: {
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 300,
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.2px',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 1.5,
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.06)',
    marginBottom: 24,
  },
  copy: {
    fontFamily: "'Manrope', sans-serif",
    fontWeight: 400,
    fontSize: 11,
    color: 'rgba(255,255,255,0.12)',
    marginTop: 28,
  },
}
