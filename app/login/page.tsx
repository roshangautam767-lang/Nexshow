import Link from 'next/link';
import { Field, Flash } from '@/components/Forms';
import { signIn } from '@/app/actions/auth';

export default function Login({ searchParams }: { searchParams: { error?: string; msg?: string; next?: string } }) {
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="mb-6 font-display text-5xl font-black">Log in</h1>
      <Flash error={searchParams.error} msg={searchParams.msg} />
      <form action={signIn} className="space-y-4">
        <input type="hidden" name="next" value={searchParams.next ?? '/account'} />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" />
        <button className="btn w-full">Log in</button>
      </form>
      <p className="mt-5 text-sm text-mu">
        <Link href="/forgot-password" className="text-red2 hover:underline">Forgot password?</Link> · <Link href="/register" className="text-red2 hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
