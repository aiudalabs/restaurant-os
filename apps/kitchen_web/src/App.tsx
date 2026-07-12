import { useKdsAuth } from './lib/auth';
import { LoginScreen } from './screens/LoginScreen';
import { BoardScreen } from './screens/BoardScreen';

export function App() {
  const { session, loading, error, stationId, loginWithPin, loginWithEmail, logout } = useKdsAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        stationId={stationId}
        error={error}
        onPin={loginWithPin}
        onEmail={loginWithEmail}
      />
    );
  }

  return <BoardScreen session={session} onLogout={logout} />;
}
