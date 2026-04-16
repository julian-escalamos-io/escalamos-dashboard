import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { esES } from '@clerk/localizations'
import App from './App.jsx'

const localization = {
  ...esES,
  formFieldInputPlaceholder__emailAddress: 'Ingresar su correo electrónico',
  formFieldInputPlaceholder__emailAddress_username: 'Ingresar su correo electrónico',
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Falta VITE_CLERK_PUBLISHABLE_KEY en .env.local')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} localization={localization}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
