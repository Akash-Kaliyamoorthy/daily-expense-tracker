import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

// Same rules as the server (validators/auth.validator.js).
function validate({ name, email, password, confirm }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter your name';
  else if (name.trim().length > 100) errors.name = 'Name must be at most 100 characters';
  if (!email.trim()) errors.email = 'Enter your email address';
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (password.length < 8) errors.password = 'Use at least 8 characters';
  else if (new TextEncoder().encode(password).length > 72)
    errors.password = 'Password is too long (72 bytes at most)';
  if (confirm !== password) errors.confirm = 'The two passwords do not match';
  return errors;
}

export default function Register() {
  usePageTitle('Create account');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
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
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast.success(`Welcome, ${user.name.split(' ')[0]}. Start by setting up this month.`);
      navigate('/setup', { replace: true });
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up takes about two minutes."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-ink-700 underline underline-offset-4 dark:text-ink-100"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && <Banner level="danger">{formError}</Banner>}
        <Input
          label="Name"
          name="name"
          autoComplete="name"
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          autoFocus
        />
        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          hint="At least 8 characters."
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="muted flex h-9 w-9 items-center justify-center rounded-control hover:bg-ink-100 dark:hover:bg-ink-900"
              aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
              aria-pressed={showPassword}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} />
            </button>
          }
        />
        <Input
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          name="confirm"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
        />
        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
