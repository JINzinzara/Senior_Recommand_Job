import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";

const LOADING_MESSAGES = [
  "설문 응답을 분석하고 있어요...",
  "맞춤 직종을 탐색하고 있어요...",
  "AI가 최적의 공고를 찾고 있어요...",
  "거의 다 됐어요!",
];

export default function LoadingScreen() {
  const router = useRouter();
  const colors = useColors();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const messageIndexRef = useRef(0);
  const messageAnim = useRef(new Animated.Value(1)).current;
  const messageRef = useRef(LOADING_MESSAGES[0]);

  const recommendMutation = trpc.jobs.recommend.useMutation();

  // 회전 애니메이션
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();

    // 펄스 애니메이션
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // 메시지 순환
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(messageAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        messageIndexRef.current =
          (messageIndexRef.current + 1) % LOADING_MESSAGES.length;
        messageRef.current = LOADING_MESSAGES[messageIndexRef.current];
        Animated.timing(messageAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // API 호출
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const stored = await AsyncStorage.getItem("surveyAnswers");
        if (!stored) {
          // @ts-ignore
          router.replace("/");
          return;
        }
        const answers = JSON.parse(stored);

        const result = await recommendMutation.mutateAsync({
          Q1: answers.Q1 ?? [],
          Q2: answers.Q2 ?? [],
          Q3: answers.Q3 ?? "상관없음",
          Q4: answers.Q4 ?? "상관없음",
          Q5: answers.Q5 ?? "4~5일",
          Q6: answers.Q6 ?? [],
        });

        await AsyncStorage.setItem(
          "recommendationResult",
          JSON.stringify(result)
        );

        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // @ts-ignore
        router.replace("/result");
      } catch (error) {
        console.error("Recommendation error:", error);
        // 오류 시에도 결과 화면으로 이동 (빈 결과)
        await AsyncStorage.setItem(
          "recommendationResult",
          JSON.stringify({ recommendations: [], candidateGroups: [] })
        );
        // @ts-ignore
        router.replace("/result");
      }
    };

    fetchRecommendations();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <ScreenContainer
      containerClassName="bg-background"
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.container}>
        {/* 배경 원 장식 */}
        <View
          style={[
            styles.bgCircle1,
            { backgroundColor: colors.primary, opacity: 0.06 },
          ]}
        />
        <View
          style={[
            styles.bgCircle2,
            { backgroundColor: colors.primary, opacity: 0.04 },
          ]}
        />

        {/* 메인 아이콘 */}
        <Animated.View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.accent, transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.mainIcon}>💼</Text>
          <Animated.View
            style={[
              styles.spinnerRing,
              { borderColor: colors.primary, transform: [{ rotate: spin }] },
            ]}
          />
        </Animated.View>

        {/* 텍스트 */}
        <Text style={[styles.title, { color: colors.foreground }]}>
          맞춤 일자리를 찾고 있어요
        </Text>

        <Animated.Text
          style={[
            styles.subtitle,
            { color: colors.muted, opacity: messageAnim },
          ]}
        >
          {messageRef.current}
        </Animated.Text>

        {/* 점 인디케이터 */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((i) => (
            <DotPulse key={i} delay={i * 200} color={colors.primary} />
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

function DotPulse({ delay, color }: { delay: number; color: string }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color, opacity: anim },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    position: "relative",
  },
  bgCircle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: "20%",
    alignSelf: "center",
  },
  bgCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: "25%",
    alignSelf: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    position: "relative",
  },
  mainIcon: {
    fontSize: 56,
  },
  spinnerRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
