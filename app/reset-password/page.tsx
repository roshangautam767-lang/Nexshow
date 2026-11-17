import { Field, Flash } from '@/components/Forms';
import { requireUser } from '@/lib/auth';
import { updatePassword } from '@/app/actions/auth';

export default async function Reset({ searchParams }: { searchParams: { error?: string } }) {
  await requireUser('/reset-password'); // the reset link logs the person in first
  return (
    <div className="container-x max-w-md py-12">
      <h1 className="mb-6 font-display text-5xl font-black">Choose a new password</h1>
      <Flash error={searchParams.error} />
      <form action={updatePassword} className="space-y-4">
        <Field label="New password (at least 8 characters)" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <Field label="Confirm new password" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        <button className="btn w-full">Update password</button>
      </form>
    </div>
  );
}
