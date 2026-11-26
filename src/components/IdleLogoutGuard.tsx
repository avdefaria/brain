import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIdleLogout } from "@/hooks/use-idle-logout";

// Aviso de "sua sessão vai acabar" e logout automático por inatividade.
export function IdleLogoutGuard({ enabled }: { enabled: boolean }) {
  const { secondsLeft, stayConnected, logoutNow } = useIdleLogout(enabled);

  return (
    <AlertDialog open={secondsLeft !== null}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você ainda está aí?</AlertDialogTitle>
          <AlertDialogDescription>
            Por segurança, sua sessão será encerrada em{" "}
            <span className="font-bold tabular text-[var(--ink-1)]">{secondsLeft ?? 0}s</span> por inatividade.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => void logoutNow()}>Sair agora</AlertDialogCancel>
          <AlertDialogAction onClick={stayConnected}>Continuar conectado</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
