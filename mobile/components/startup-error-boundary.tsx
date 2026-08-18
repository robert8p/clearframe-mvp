import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { colors } from "@/lib/theme";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class StartupErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Cogni startup/render error", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 16 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: "900" }}>
            Cogni couldn’t start cleanly
          </Text>
          <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>
            The app hit a local startup problem. Your learning data is stored on Cogni’s server, so trying again is safe.
          </Text>
          <View style={{ padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.panel }}>
            <Text selectable style={{ color: colors.soft, fontSize: 13, lineHeight: 19 }}>
              {error.message || "Unknown startup error"}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try starting Cogni again"
            onPress={this.retry}
            style={({ pressed }) => ({
              minHeight: 56,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 18,
              backgroundColor: colors.violet,
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <Text style={{ color: colors.white, fontSize: 16, fontWeight: "900" }}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
