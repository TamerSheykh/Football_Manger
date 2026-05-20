import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { Toaster } from "sonner"
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#191a1b',
              color: '#ffffff',
              border: '1px solid #2a2b2c',
            },
          }}
        />
        <App />
      </TRPCProvider>
    </BrowserRouter>
  </StrictMode>,
)
