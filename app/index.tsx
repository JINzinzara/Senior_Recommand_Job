import { View, Pressable, StyleSheet } from "react-native";
import { Text } from "@/components/text";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();
  const colors = useColors();

  const handleStart = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // @ts-ignore
    router.push("/survey");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* 메인 문구 - 진한 브라운 */}
        <Text style={styles.mainText}>
          일자리 찾고{"\n"}계신가요?
        </Text>
      </View>

      {/* 시작 버튼 */}
      <View style={styles.buttonContainer}>
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={styles.startButtonText}>시작하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  mainText: {
    fontSize: 56,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 72,
    letterSpacing: -1,
    color: "#5C3D2E",
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 24,
    alignItems: "center",
  },
  startButton: {
    width: "100%",
    height: 72,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
