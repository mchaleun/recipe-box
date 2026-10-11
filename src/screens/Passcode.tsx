import { useEffect, useState, type ReactNode } from 'react';
import { getServerInfo, PASSCODE_KEY, savedPasscode } from '../data/repository';
import { Icon } from '../components/Icon';

type Gate = 'checking' | 'locked' | 'open';

async function passcodeWorks(code: string): Promise<boolean> {
  const res = await fetch('/api/library?since=check', { headers: { 'x-family-passcode': code }, cache: 'no-store' });
  return res.status !== 401;
}

/** Online, the library is behind a family passcode. Each device asks once and remembers it. */
export function PasscodeGate({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<Gate>('checking');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getServerInfo().then(async (info) => {
      if (!info?.auth) return setGate('open');
      const saved = savedPasscode();
      setGate(saved && (await passcodeWorks(saved).catch(() => true)) ? 'open' : 'locked');
    });
  }, []);

  if (gate === 'open') return <>{children}</>;
  if (gate === 'checking') return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    if (!value) return;
    setBusy(true);
    setError('');
    try {
      if (await passcodeWorks(value)) {
        try { localStorage.setItem(PASSCODE_KEY, value); } catch { /* asked again next visit */ }
        setGate('open');
      } else {
        setError('That passcode isn’t right. Try again.');
      }
    } catch {
      setError('Can’t reach the recipe box right now. Check the internet connection.');
    }
    setBusy(false);
  };

  return (
    <main className="passcode">
      <form onSubmit={submit}>
        <span className="brand-mark big"><Icon name="flame" size={30} stroke={2.2} /></span>
        <h1 className="large-title">Recipe Box</h1>
        <p className="secondary">Enter the family passcode. This device will remember it.</p>
        <input
          id="passcode"
         
          type="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoFocus
          placeholder="Passcode"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(''); }}
        />
        {error && <p className="footnote" role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
        <button className="btn primary" type="submit" disabled={busy || !code.trim()}>{busy ? 'Checking…' : 'Open Recipes'}</button>
      </form>
    </main>
  );
}
