import { View, StyleSheet, Animated, Platform, Text as RNText } from "react-native";
import { Text } from "@/components/text";

const AnimatedText = Animated.createAnimatedComponent(RNText);
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

        const locRaw = await AsyncStorage.getItem("userLocation");
        const location = locRaw
          ? (JSON.parse(locRaw) as { latitude: number; longitude: number })
          : undefined;

        const result = await recommendMutation.mutateAsync({
          Q1: answers.Q1 ?? [],
          Q2: answers.Q2 ?? [],
          Q3: answers.Q3 ?? "상관없음",
          Q4: answers.Q4 ?? "상관없음",
          Q5: answers.Q5 ?? "4~5일",
          Q6: answers.Q6 ?? [],
          location,
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
      containerClassName="bg-white"
      edges={["top", "bottom", "left", "right"]}
    >
      <View style={styles.container}>
        {/* 배경 원 장식 */}
        <View
          style={[
            styles.bgCircle1,
            { backgroundColor: "#D4A574", opacity: 0.08 },
          ]}
        />
        <View
          style={[
            styles.bgCircle2,
            { backgroundColor: "#D4A574", opacity: 0.05 },
          ]}
        />

        {/* 메인 아이콘 */}
        <Animated.View
          style={[
            styles.iconContainer,
            { backgroundColor: "#F5E6D3", transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.mainIcon}>💼</Text>
          <Animated.View
            style={[
            styles.spinnerRing,
            { borderColor: "#D4A574", transform: [{ rotate: spin }] },
            ]}
          />
        </Animated.View>

        {/* 텍스트 */}
        <Text style={[styles.title, { color: "#5C3D2E" }]}>
          맞춤 일자리를 찾고 있어요
        </Text>

        <AnimatedText
          style={[
            styles.subtitle,
            { color: "#8B6F47", opacity: messageAnim, fontFamily: "JalnanGothic" },
          ]}
        >
          {messageRef.current}
        </AnimatedText>

        {/* 점 인디케이터 */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((i) => (
            <DotPulse key={i} delay={i * 200} color="#D4A574" />
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
    width: 140,
    height: 140,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 48,
    position: "relative",
  },
  mainIcon: {
    fontSize: 64,
  },
  spinnerRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 48,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
