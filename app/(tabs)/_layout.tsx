// This file is intentionally left minimal.
// The app uses Stack navigation instead of Tabs.
// See app/_layout.tsx for the main navigation setup.
import { Redirect } from "expo-router";

export default function TabsLayout() {
  return <Redirect href="/" />;
}
