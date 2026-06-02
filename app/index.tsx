import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
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
    // @ts-ignore - typed routes will be resolved after all screens are created
    router.push("/survey");
  };

  return (
    <ScreenContainer
      containerClassName="bg-background"
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.container}>
        {/* 상단 장식 영역 */}
        <View style={[styles.topDecoration, { backgroundColor: colors.primary }]} />

        {/* 메인 콘텐츠 */}
        <View style={styles.content}>
          {/* 로고 영역 */}
          <View style={[styles.logoContainer, { backgroundColor: colors.accent }]}>
            <Text style={styles.logoEmoji}>💼</Text>
          </View>

          {/* 앱 제목 */}
          <Text style={[styles.title, { color: colors.foreground }]}>
            시니어 일자리 추천
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            나에게 딱 맞는 일자리를 찾아드려요
          </Text>

          {/* 안내 카드 */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📝</Text>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoTitle, { color: colors.foreground }]}>간단한 설문 6가지</Text>
                <Text style={[styles.infoDesc, { color: colors.muted }]}>나의 성격과 관심사를 알려주세요</Text>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎯</Text>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoTitle, { color: colors.foreground }]}>맞춤 일자리 추천</Text>
                <Text style={[styles.infoDesc, { color: colors.muted }]}>AI가 최적의 공고를 찾아드려요</Text>
              </View>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🔒</Text>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoTitle, { color: colors.foreground }]}>회원가입 불필요</Text>
                <Text style={[styles.infoDesc, { color: colors.muted }]}>개인정보 입력 없이 바로 시작</Text>
              </View>
            </View>
          </View>
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
            <Text style={styles.startButtonArrow}>→</Text>
          </Pressable>
          <Text style={[styles.timeNote, { color: colors.muted }]}>약 2분 소요</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  topDecoration: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    opacity: 0.12,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoEmoji: {
    fontSize: 52,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    textAlign: "center",
    marginBottom: 36,
    lineHeight: 24,
  },
  infoCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 16,
  },
  infoIcon: {
    fontSize: 28,
    width: 36,
    textAlign: "center",
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoDivider: {
    height: 1,
    marginHorizontal: 4,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: "center",
    gap: 10,
  },
  startButton: {
    width: "100%",
    height: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  startButtonArrow: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  timeNote: {
    fontSize: 14,
  },
});
