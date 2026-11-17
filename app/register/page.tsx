import Link from 'next/link';
import { Field, Flash } from '@/components/Forms';
import { signUp } from '@/app/actions/auth';

export default function Register({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="mb-6 font-display text-5xl font-black">Create account</h1>
      <Flash error={searchParams.error} />
      <form action={signUp} className="space-y-4">
        <Field label="Full name" name="full_name" required autoComplete="name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" />
        <Field label="Phone (optional, for WhatsApp tickets)" name="phone" type="tel" placeholder="+919876543210" autoComplete="tel" />
        <Field label="Password (at least 8 characters)" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <button className="btn w-full">Sign up</button>
      </form>
      <p className="mt-5 text-sm text-mu">Already have an account? <Link href="/login" className="text-red2 hover:underline">Log in</Link></p>
    </div>
  );
}
