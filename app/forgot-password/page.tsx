import Link from 'next/link';
import { Field, Flash } from '@/components/Forms';
import { requestReset } from '@/app/actions/auth';

export default function Forgot({ searchParams }: { searchParams: { error?: string; msg?: string } }) {
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="mb-2 font-display text-5xl font-black">Forgot password</h1>
      <p className="mb-6 text-mu">Enter your email and we will send you a link to choose a new password.</p>
      <Flash error={searchParams.error} msg={searchParams.msg} />
      <form action={requestReset} className="space-y-4">
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <button className="btn w-full">Send reset link</button>
      </form>
      <p className="mt-5 text-sm"><Link href="/login" className="text-red2 hover:underline">Back to log in</Link></p>
    </div>
  );
}
