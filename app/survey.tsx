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
import { REGIONS, SIDO_LIST } from "@/constants/regions";

// Q1~Q6 설문 데이터
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
      { label: "한식조리기능사" },
      { label: "운전면허" },
      { label: "경비원 신임교육 이수" },
    ],
  },
];

// Q7: 시/도, Q8: 시/군/구 포함 총 단계
const TOTAL_STEPS = SURVEY_QUESTIONS.length + 2; // +2 for Q7, Q8

type Answers = {
  Q1: string[];
  Q2: string[];
  Q3: string;
  Q4: string;
  Q5: string;
  Q6: string[];
  Q7: string;
  Q8: string;
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
    Q7: "",
    Q8: "",
  });

  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Q7 단계: SURVEY_QUESTIONS.length (인덱스 6)
  // Q8 단계: SURVEY_QUESTIONS.length + 1 (인덱스 7)
  const isQ7Step = currentStep === SURVEY_QUESTIONS.length;
  const isQ8Step = currentStep === SURVEY_QUESTIONS.length + 1;
  const isLastStep = currentStep === TOTAL_STEPS - 1;

  // 현재 질문 (Q1~Q6)
  const currentQuestion = !isQ7Step && !isQ8Step ? SURVEY_QUESTIONS[currentStep] : null;
  const questionKey = currentQuestion ? (currentQuestion.id as keyof Answers) : null;
  const currentAnswers = questionKey ? answers[questionKey] : null;
  const selectedArray = Array.isArray(currentAnswers)
    ? currentAnswers
    : currentAnswers
    ? [currentAnswers]
    : [];

  // 현재 단계 답변 여부
  const isAnswered = (() => {
    if (isQ7Step) return answers.Q7 !== "";
    if (isQ8Step) return answers.Q8 !== "";
    if (!currentQuestion) return false;
    return currentQuestion.required ? selectedArray.length > 0 : true;
  })();

  // Q8 선택지 (Q7 선택된 시/도에 따라 동적 변경)
  const sigunguOptions = answers.Q7 ? REGIONS[answers.Q7] ?? [] : [];

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep + 1) / TOTAL_STEPS,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  const fadeTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSelect = (option: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isQ7Step) {
      // 시/도 변경 시 시/군/구 초기화
      setAnswers((prev) => ({ ...prev, Q7: option, Q8: "" }));
      return;
    }
    if (isQ8Step) {
      setAnswers((prev) => ({ ...prev, Q8: option }));
      return;
    }

    if (!currentQuestion || !questionKey) return;
    const maxSelect = currentQuestion.maxSelect;

    if (maxSelect === 1) {
      setAnswers((prev) => ({ ...prev, [questionKey]: option }));
    } else {
      setAnswers((prev) => {
        const current = (prev[questionKey] as string[]) ?? [];
        if (current.includes(option)) {
          return { ...prev, [questionKey]: current.filter((o) => o !== option) };
        } else if (current.length < maxSelect) {
          return { ...prev, [questionKey]: [...current, option] };
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

    if (isLastStep) {
      fadeTransition(async () => {
        await AsyncStorage.setItem("surveyAnswers", JSON.stringify(answers));
        // @ts-ignore
        router.push("/loading");
      });
    } else {
      fadeTransition(() => {
        setCurrentStep((prev) => prev + 1);
      });
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      // @ts-ignore
      router.back();
      return;
    }
    fadeTransition(() => {
      setCurrentStep((prev) => prev - 1);
    });
  };

  // 현재 단계 렌더링할 선택지
  const renderOptions = () => {
    if (isQ7Step) {
      return SIDO_LIST.map((sido) => {
        const isSelected = answers.Q7 === sido;
        return (
          <Pressable
            key={sido}
            onPress={() => handleSelect(sido)}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: isSelected ? "#D4A574" : "#FFFFFF",
                borderColor: isSelected ? "#D4A574" : "#E8D4B8",
                borderWidth: 1.5,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={[styles.optionLabel, { color: isSelected ? "#FFFFFF" : "#5C3D2E" }]}>
              {sido}
            </Text>
          </Pressable>
        );
      });
    }

    if (isQ8Step) {
      return sigunguOptions.map((sigungu) => {
        const isSelected = answers.Q8 === sigungu;
        return (
          <Pressable
            key={sigungu}
            onPress={() => handleSelect(sigungu)}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: isSelected ? "#D4A574" : "#FFFFFF",
                borderColor: isSelected ? "#D4A574" : "#E8D4B8",
                borderWidth: 1.5,
              },
              pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
            ]}
          >
            <Text style={[styles.optionLabel, { color: isSelected ? "#FFFFFF" : "#5C3D2E" }]}>
              {sigungu}
            </Text>
          </Pressable>
        );
      });
    }

    // Q1~Q6
    return (currentQuestion?.options ?? []).map((option) => {
      const isSelected = selectedArray.includes(option.label);
      return (
        <Pressable
          key={option.label}
          onPress={() => handleSelect(option.label)}
          style={({ pressed }) => [
            styles.optionCard,
            {
              backgroundColor: isSelected ? "#D4A574" : "#FFFFFF",
              borderColor: isSelected ? "#D4A574" : "#E8D4B8",
              borderWidth: 1.5,
            },
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={[styles.optionLabel, { color: isSelected ? "#FFFFFF" : "#5C3D2E" }]}>
            {option.label}
          </Text>
        </Pressable>
      );
    });
  };

  const questionText = isQ7Step
    ? "근무 희망\n지역은 어디인가요?"
    : isQ8Step
    ? `${answers.Q7}\n어느 구/군인가요?`
    : currentQuestion?.question ?? "";

  const hintText = isQ7Step || isQ8Step
    ? "1개 선택"
    : currentQuestion?.id === "Q6"
    ? "없을 시 다음을 눌러주세요"
    : `${currentQuestion?.maxSelect}개까지 선택 가능`;

  return (
    <ScreenContainer
      containerClassName="bg-white"
      edges={["top", "left", "right", "bottom"]}
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
          {currentStep + 1} / {TOTAL_STEPS}
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
          <View style={styles.questionHeader}>
            <Text style={styles.questionText}>{questionText}</Text>
            <Text style={styles.hintText}>{hintText}</Text>
          </View>

          <View style={styles.optionsContainer}>
            {renderOptions()}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </Animated.View>

      {/* 다음 버튼 */}
      <View style={[styles.bottomBar, { backgroundColor: "#FFFFFF", borderTopColor: "#E8D4B8" }]}>
        <Pressable
          onPress={handleNext}
          disabled={!isAnswered}
          style={({ pressed }) => [
            styles.nextButton,
            { backgroundColor: isAnswered ? "#D4A574" : "#D4C4B0" },
            pressed && isAnswered && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Text style={[styles.nextButtonText, { color: isAnswered ? "#FFFFFF" : "#8B6F47" }]}>
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
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 18,
    minHeight: 68,
  },
  optionLabel: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 32,
    textAlign: "center",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
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
