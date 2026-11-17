export function Flash({ error, msg }: { error?: string; msg?: string }) {
  if (!error && !msg) return null;
  return (
    <p role={error ? 'alert' : 'status'} className={`mb-4 rounded border bg-panel p-3 text-sm ${error ? 'border-red text-red2' : 'border-line text-tx'}`}>
      {error ?? msg}
    </p>
  );
}

type FieldProps = {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string | number;
  autoComplete?: string; placeholder?: string; minLength?: number; step?: string; min?: number;
};
export function Field({ label, name, type = 'text', ...rest }: FieldProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-mu">{label}</span>
      <input name={name} type={type} {...rest} className="w-full rounded border border-line bg-panel px-3 py-2 focus:border-red" />
    </label>
  );
}
