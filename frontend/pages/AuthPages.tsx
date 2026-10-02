import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../layouts/AppLayout';
import { STORAGE, useAuth } from '../hooks/useAuth';
import { Alert, Field, Spinner } from '../components/ui';
import { api, ApiError } from '../services/api';
import { useToast } from '../hooks/useToast';

export function LoginPage() {
  const { login, user, sessionMessage, clearSessionMessage } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState(() => localStorage.getItem(STORAGE.rememberedUsername) ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => !!localStorage.getItem(STORAGE.rememberedUsername));
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [serverError, setServerError] = useState<{ message: string; code: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === 'ADMIN' ? '/admin' : params.get('next') || '/dashboard', { replace: true });
  }, [user, navigate, params]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!username.trim()) errs.username = 'Username is required';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    setServerError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await login(username.trim(), password, remember);
    } catch (err) {
      const e2 = err as ApiError;
      setServerError({ message: e2.message, code: e2.errorCode });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <div className="mb-8 lg:hidden">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-xl font-black text-brand-500">P</div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-500">Log in to ParaBank Pro Online Banking</p>

        {(sessionMessage || params.get('reason') === 'expired') && (
          <div className="mt-6">
            <Alert kind={sessionMessage?.includes('logged out') ? 'success' : 'warning'} testId="session-message">
              {sessionMessage ?? 'Your session has expired. Please log in again.'}
            </Alert>
          </div>
        )}
        {serverError && (
          <div className="mt-6">
            <Alert kind="error" testId="login-error">
              <p className="font-semibold">{serverError.message}</p>
              <p className="mt-0.5 text-xs opacity-80">Error code: {serverError.code}</p>
            </Alert>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={submit} noValidate aria-label="Login form">
          <Field label="Username" htmlFor="username" error={errors.username}>
            <input id="username" name="username" className="input" autoComplete="username" placeholder="Enter your username" value={username} aria-invalid={!!errors.username} onChange={(e) => { setUsername(e.target.value); clearSessionMessage(); }} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password}>
            <div className="relative">
              <input id="password" name="password" type={showPassword ? 'text' : 'password'} className="input pr-16" autoComplete="current-password" placeholder="Enter your password" value={password} aria-invalid={!!errors.password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100" onClick={() => setShowPassword((s) => !s)} aria-pressed={showPassword}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-brand-600" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember Me
            </label>
            <Link to="/forgot-password" className="text-sm font-semibold text-brand-700 hover:underline">
              Forgot Password?
            </Link>
          </div>
          <button type="submit" className="btn-primary w-full py-2.5" data-testid="login-submit" disabled={busy}>
            {busy && <Spinner />}
            {busy ? 'Signing in...' : 'Login'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          New to ParaBank Pro?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Register
          </Link>
        </p>

        <details className="mt-8 rounded-xl border border-dashed border-slate-300 p-4 text-sm" data-testid="demo-credentials">
          <summary className="cursor-pointer font-semibold text-slate-700">Practice credentials</summary>
          <table className="mt-3 w-full text-left text-xs">
            <tbody className="divide-y divide-slate-100">
              {[
                ['Customer', 'john', 'Demo@123'],
                ['Customer 2', 'sarah', 'Demo@123'],
                ['Admin', 'admin', 'Admin@123'],
                ['Locked user', 'locked', 'Demo@123'],
                ['Disabled user', 'disabled', 'Demo@123'],
              ].map(([role, u, p]) => (
                <tr key={u}>
                  <td className="py-1.5 text-slate-500">{role}</td>
                  <td className="py-1.5 font-mono">{u}</td>
                  <td className="py-1.5 font-mono">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-500">Transfer & card OTP: <span className="font-mono">123456</span></p>
        </details>
      </div>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', username: '', password: '', confirmPassword: '', acceptTerms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError(null);
    try {
      const { data } = await api.post('/api/auth/register', form, { silentAuth: true });
      toast('success', 'Registration successful', `Customer ${data.customerId} created. Account ${data.accountNumber} opened.`);
      navigate('/login');
    } catch (err) {
      const e2 = err as ApiError;
      setErrors(e2.fieldErrors);
      setError(e2.errorCode === 'VALIDATION_ERROR' ? null : e2.message);
    } finally {
      setBusy(false);
    }
  };

  const input = (k: keyof typeof form, label: string, type = 'text', auto?: string) => (
    <Field label={label} htmlFor={`reg-${k}`} error={errors[k]} required={k !== 'phone'}>
      <input id={`reg-${k}`} type={type} className="input" autoComplete={auto} value={form[k] as string} onChange={set(k)} aria-invalid={!!errors[k]} />
    </Field>
  );

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-slate-900">Open an account</h1>
        <p className="mt-1 text-sm text-slate-500">Registration creates a checking account with a $1,000 welcome bonus.</p>
        {error && (
          <div className="mt-4">
            <Alert kind="error" testId="register-error">
              {error}
            </Alert>
          </div>
        )}
        <form className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submit} noValidate aria-label="Registration form">
          {input('firstName', 'First Name', 'text', 'given-name')}
          {input('lastName', 'Last Name', 'text', 'family-name')}
          <div className="sm:col-span-2">{input('email', 'Email', 'email', 'email')}</div>
          {input('phone', 'Phone', 'tel', 'tel')}
          {input('username', 'Username', 'text', 'username')}
          {input('password', 'Password', 'password', 'new-password')}
          {input('confirmPassword', 'Confirm Password', 'password', 'new-password')}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.acceptTerms} onChange={set('acceptTerms')} className="h-4 w-4 accent-brand-600" />I accept the terms and conditions
            </label>
            {errors.acceptTerms && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{errors.acceptTerms}</p>}
          </div>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:underline">
              Back to login
            </Link>
            <button className="btn-primary" type="submit" disabled={busy} data-testid="register-submit">
              {busy && <Spinner />}Register
            </button>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/api/auth/forgot-password', { usernameOrEmail: value }, { silentAuth: true });
      setResult({ kind: 'success', text: `${data.message} Reference: ${data.resetRequestId}` });
    } catch (err) {
      setResult({ kind: 'error', text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your username or email and we’ll send reset instructions.</p>
        {result && (
          <div className="mt-4">
            <Alert kind={result.kind} testId="forgot-result">
              {result.text}
            </Alert>
          </div>
        )}
        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
          <Field label="Username or Email" htmlFor="identifier">
            <input id="identifier" className="input" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
          <button className="btn-primary w-full" disabled={busy}>
            {busy && <Spinner />}Send Reset Link
          </button>
        </form>
        <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-brand-700 hover:underline">
          ← Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}

export function UnauthorizedPage() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-lg py-16 text-center" data-testid="unauthorized-page">
      <p className="text-6xl font-black text-slate-200">403</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Unauthorized</h1>
      <p className="mt-2 text-slate-500">
        Your role <span className="code">{user?.role}</span> does not have access to this page.
      </p>
      <Link to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} className="btn-primary mt-6">
        Go to my home page
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center" data-testid="not-found-page">
      <p className="text-6xl font-black text-slate-200">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-500">The page you are looking for doesn’t exist.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </div>
  );
}
