import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

const base = 'rounded-2xl px-5 py-4 items-center justify-center flex-row';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-500 active:bg-brand-600',
  secondary: 'bg-zinc-100 active:bg-zinc-200 dark:bg-zinc-800 dark:active:bg-zinc-700',
  ghost: 'bg-transparent active:bg-zinc-100 dark:active:bg-zinc-800',
};
const labels: Record<Variant, string> = {
  primary: 'text-white font-semibold text-base',
  secondary: 'text-zinc-900 dark:text-white font-semibold text-base',
  ghost: 'text-brand-500 font-semibold text-base',
};

export function Button({
  label,
  variant = 'primary',
  loading,
  disabled,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      className={`${base} ${variants[variant]} ${isDisabled ? 'opacity-60' : ''}`}
      disabled={isDisabled}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#10b981'} />
      ) : (
        <Text className={labels[variant]}>{label}</Text>
      )}
    </Pressable>
  );
}
