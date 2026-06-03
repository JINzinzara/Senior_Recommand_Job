import {
  View,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { Text } from "@/components/text";
import { useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

// 설문 데이터 정의
const SURVEY_QUESTIONS = [
  {
    id: "Q1",
    question: "나와 가장 잘 맞는\n성격은?",
    maxSelect: 2,
    required: true,
    options: [
      { label: "친절하고 사람을 좋아해요" },
      { label: "꼼꼼해요" },
      { label: "성실하고 책임감 있어요" },
      { label: "창의적이에요" },
      { label: "자연을 좋아해요" },
    ],
  },
  {
    id: "Q2",
    question: "가장 끌리는\n일터 장면은?",
    maxSelect: 2,
    required: true,
    options: [
      { label: "보육, 돌봄" },
      { label: "동네 관리 및 청소" },
      { label: "가게 운영" },
      { label: "음식 만들기" },
      { label: "식물 가꾸기" },
      { label: "행사 및 문화 돕기" },
      { label: "서류 정리" },
      { label: "교육 및 상담" },
      { label: "카페 및 바리스타" },
    ],
  },
  {
    id: "Q3",
    question: "하루에 감당할 수 있는\n활동량은?",
    maxSelect: 1,
    required: true,
    options: [
      { label: "주로 앉아서" },
      { label: "가볍게 걷기" },
      { label: "야외 활동 가능" },
    ],
  },
  {
    id: "Q4",
    question: "선호하는 일터\n환경은?",
    maxSelect: 1,
    required: true,
    options: [
      { label: "실내" },
      { label: "실외" },
      { label: "상관없음" },
    ],
  },
  {
    id: "Q5",
    question: "일주일에 몇 일\n근무하기를 원하세요?",
    maxSelect: 1,
    required: true,
    options: [
      { label: "짧게" },
      { label: "4~5일" },
    ],
  },
  {
    id: "Q6",
    question: "보유 중인\n자격증은?",
    maxSelect: 10,
    required: false,
    options: [
      { label: "사회복지사 1급/2급 자격증" },
      { label: "요양보호사 자격증" },
    ],
  },
];

type Answers = {
  Q1: string[];
  Q2: string[];
  Q3: string;
  Q4: string;
  Q5: string;
  Q6: string[];
};

export default function SurveyScreen() {
  const router = useRouter();
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    Q1: [],
    Q2: [],
    Q3: "",
    Q4: "",
    Q5: "",
    Q6: [],
  });

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const totalSteps = SURVEY_QUESTIONS.length;
  const currentQuestion = SURVEY_QUESTIONS[currentStep];
  const questionKey = currentQuestion.id as keyof Answers;
  const currentAnswers = answers[questionKey];
  const selectedArray = Array.isArray(currentAnswers) ? currentAnswers : currentAnswers ? [currentAnswers] : [];

  // 현재 질문에 답변이 있는지 확인
  const isAnswered = currentQuestion.required
    ? selectedArray.length > 0
    : true; // Q6는 필수 아님

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / totalSteps,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const handleSelect = (option: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const maxSelect = currentQuestion.maxSelect;
    const key = questionKey;

    if (maxSelect === 1) {
      setAnswers((prev) => ({ ...prev, [key]: [option] }));
    } else {
      setAnswers((prev) => {
        const current = (prev[key] as string[]) ?? [];
        if (current.includes(option)) {
          return { ...prev, [key]: current.filter((o) => o !== option) };
        } else if (current.length < maxSelect) {
          return { ...prev, [key]: [...current, option] };
        }
        return prev;
      });
    }
  };

  const handleNext = async () => {
    if (!isAnswered) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // 페이드 아웃
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(async () => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else {
        // 마지막 단계 - 위치 권한 요청 후 결과 화면으로 이동
        await AsyncStorage.setItem("surveyAnswers", JSON.stringify(answers));
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            await AsyncStorage.setItem(
              "userLocation",
              JSON.stringify({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              })
            );
          } else {
            await AsyncStorage.removeItem("userLocation");
          }
        } catch {
          // 위치 실패해도 추천은 계속 진행
          await AsyncStorage.removeItem("userLocation");
        }
        // @ts-ignore
        router.push("/loading");
      }
    });
  };

  const handleBack = () => {
    if (currentStep === 0) {
      // @ts-ignore
      router.back();
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep((prev) => prev - 1);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <ScreenContainer
      containerClassName="bg-white"
      edges={["top", "left", "right"]}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: "#F5E6D3" },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.stepText}>
          {currentStep + 1} / {totalSteps}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* 진행 바 */}
      <View style={[styles.progressContainer, { backgroundColor: "#E8D4B8" }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: "#D4A574",
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {/* 질문 + 선택지 */}
      <Animated.View style={[styles.questionContainer, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 질문 */}
          <View style={styles.questionHeader}>
            <Text style={styles.questionText}>
              {currentQuestion.question}
            </Text>
            <Text style={styles.hintText}>
              {currentQuestion.maxSelect}개까지 선택 가능
            </Text>
          </View>

          {/* 선택지 */}
          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option) => {
              const isSelected = selectedArray.includes(option.label);
              return (
                <Pressable
                  key={option.label}
                  onPress={() => handleSelect(option.label)}
                  style={({ pressed }) => [
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? "#F5E6D3" : "#FFFFFF",
                      borderColor: isSelected ? "#D4A574" : "#E8D4B8",
                      borderWidth: isSelected ? 2 : 1,
                    },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <View
                      style={[
                        styles.checkmark,
                        { backgroundColor: "#D4A574" },
                      ]}
                    >
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* 하단 여백 (버튼 공간) */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      {/* 다음 버튼 (고정) */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: "#FFFFFF", borderTopColor: "#E8D4B8" },
        ]}
      >
        <Pressable
          onPress={handleNext}
          disabled={!isAnswered}
          style={({ pressed }) => [
            styles.nextButton,
            {
              backgroundColor: isAnswered ? "#D4A574" : "#D4C4B0",
            },
            pressed && isAnswered && {
              opacity: 0.85,
              transform: [{ scale: 0.97 }],
            },
          ]}
        >
          <Text
            style={[
              styles.nextButtonText,
              { color: isAnswered ? "#FFFFFF" : "#8B6F47" },
            ]}
          >
            {isLastStep ? "결과 보기" : "다음"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 24,
    fontWeight: "600",
    color: "#5C3D2E",
  },
  stepText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5C3D2E",
  },
  progressContainer: {
    height: 8,
    marginHorizontal: 20,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  questionContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  questionHeader: {
    marginBottom: 32,
  },
  questionText: {
    fontSize: 38,
    fontWeight: "700",
    lineHeight: 50,
    marginBottom: 14,
    letterSpacing: -0.5,
    color: "#5C3D2E",
  },
  hintText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
    color: "#EF4444",
  },
  optionsContainer: {
    gap: 14,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 18,
    gap: 16,
    minHeight: 76,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 32,
    color: "#5C3D2E",
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  nextButton: {
    height: 68,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
