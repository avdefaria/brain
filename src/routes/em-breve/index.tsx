import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { Rocket } from 'lucide-react'

export const Route = createFileRoute('/em-breve/')({
  component: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-16 h-16 bg-[#3D4FE8]/8 rounded-2xl flex items-center justify-center mb-6">
        <Rocket className="w-8 h-8 text-[#3D4FE8]" />
      </div>
      <h1 className="text-2xl font-bold text-[#0E0E16] mb-2 font-title">Módulo em Desenvolvimento</h1>
      <p className="text-[#8A8FA3] max-w-md mx-auto">
        Estamos trabalhando para trazer esta funcionalidade para o Brain. Em breve você terá acesso completo a este módulo.
      </p>
    </div>
  )
})
