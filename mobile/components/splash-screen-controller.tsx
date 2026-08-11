import { useEffect } from "react";
import { SplashScreen } from "expo-router";
import { useAuth } from "@/lib/auth";

void SplashScreen.preventAutoHideAsync();

export function SplashScreenController() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  return null;
}
