import React, { useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "@/lib/theme";
import { fieldStyle } from "@/components/ui";

type FormFieldProps = TextInputProps & {
  label: string;
  hint?: string;
};

export const FormField = React.forwardRef<TextInput, FormFieldProps>(function FormField({ label, hint, onFocus, onBlur, style, multiline, accessibilityLabel, accessibilityHint, ...props }, ref) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.text, fontSize: 15.5, lineHeight: 21, fontWeight: "800" }}>{label}</Text>
      {hint ? <Text style={{ color: colors.muted, fontSize: 12.5, lineHeight: 18 }}>{hint}</Text> : null}
      <TextInput
        ref={ref}
        {...props}
        multiline={multiline}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint ?? hint}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          fieldStyle,
          multiline ? { minHeight: 126, textAlignVertical: "top", paddingVertical: 14 } : null,
          focused ? { borderColor: colors.cyan, boxShadow: "0 0 0 1px rgba(0,229,255,0.28)" } : null,
          style,
        ]}
      />
    </View>
  );
});
