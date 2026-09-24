import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { Rocket } from 'lucide-react'

export const Route = createFileRoute('/em-breve/')({
  component: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-16 h-16 bg-[var(--violet-500)]/8 rounded-2xl flex items-center justify-center mb-6">
        <Rocket className="w-8 h-8 text-[var(--violet-500)]" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--ink-1)] mb-2 font-title">Módulo em Desenvolvimento</h1>
      <p className="text-[var(--ink-3)] max-w-md mx-auto">
        Estamos trabalhando para trazer esta funcionalidade para o Brain. Em breve você terá acesso completo a este módulo.
      </p>
    </div>
  )
})
