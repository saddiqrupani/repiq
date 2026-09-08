import { forwardRef } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

export type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, className, ...rest },
  ref,
) {
  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#9ca3af"
        className={`rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-base text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white ${error ? 'border-red-500' : ''} ${className ?? ''}`}
        {...rest}
      />
      {error ? <Text className="text-xs text-red-500">{error}</Text> : null}
    </View>
  );
});
