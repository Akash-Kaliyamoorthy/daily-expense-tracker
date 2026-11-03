import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import AuthLayout from '../components/layout/AuthLayout';
import Banner from '../components/ui/Banner';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import usePageTitle from '../hooks/usePageTitle';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Enter your password';
  return errors;
}

export default function Login() {
  usePageTitle('Log in');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setForm((f) => ({ ...f, [field]: event.target.value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const user = await login({ email: form.email.trim(), password: form.password });
      toast.success(`Welcome back, ${user.name.split(' ')[0]}.`);
      navigate(from, { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="See what is left for today."
      footer={
        <>
          New here?{' '}
          <Link
            to="/register"
            className="font-medium text-ink-700 underline underline-offset-4 dark:text-ink-100"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && <Banner level="danger">{formError}</Banner>}
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          autoFocus
        />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="muted flex h-9 w-9 items-center justify-center rounded-control hover:bg-ink-100 dark:hover:bg-ink-900"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} />
            </button>
          }
        />
        <Button type="submit" loading={submitting} className="w-full">
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
