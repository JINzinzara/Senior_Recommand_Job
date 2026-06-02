import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 설문 데이터 정의
const SURVEY_QUESTIONS = [
  {
    id: "Q1",
    question: "나와 가장 잘 맞는\n성격은 무엇인가요?",
    hint: "2개까지 선택 가능",
    maxSelect: 2,
    required: true,
    options: [
      { label: "친절하고 사람을 좋아해요", emoji: "😊", sub: "사람 중심" },
      { label: "꼼꼼해요", emoji: "🔍", sub: "세밀한 작업 중심" },
      { label: "성실하고 책임감 있어요", emoji: "💪", sub: "규칙·위생 준수 중심" },
      { label: "창의적이에요", emoji: "🎨", sub: "예술·공예 중심" },
      { label: "자연을 좋아해요", emoji: "🌿", sub: "생태·농촌 중심" },
    ],
  },
  {
    id: "Q2",
    question: "가장 끌리는 일터 장면을\n골라주세요",
    hint: "2개까지 선택 가능",
    maxSelect: 2,
    required: true,
    options: [
      {
        label: "보육, 돌봄",
        emoji: "👶",
        sub: "영유아 보육, 아이돌봄, 어르신 요양지원",
      },
      {
        label: "동네 관리 및 청소",
        emoji: "🏢",
        sub: "보안 경비, 환경미화, 가사지원",
      },
      {
        label: "가게 운영",
        emoji: "🛒",
        sub: "매장 판매, 고객관리 및 응대",
      },
      {
        label: "음식 만들기",
        emoji: "🍳",
        sub: "음식조리, 한식, 김치·반찬 가공",
      },
      {
        label: "식물 가꾸기",
        emoji: "🌱",
        sub: "채소재배, 과수재배 등 농업 활동",
      },
      {
        label: "행사 및 문화 돕기",
        emoji: "🎭",
        sub: "문화·예술기획, 자원봉사관리",
      },
      {
        label: "서류 정리",
        emoji: "📋",
        sub: "사무행정, 기록물 관리",
      },
      {
        label: "교육 및 상담",
        emoji: "📚",
        sub: "평생교육, 보건교육, 청소년상담",
      },
      {
        label: "카페 및 바리스타",
        emoji: "☕",
        sub: "커피 추출, 음료 제조",
      },
    ],
  },
  {
    id: "Q3",
    question: "하루에 감당할 수 있는\n활동량은 어느 정도인가요?",
    hint: "1개 선택",
    maxSelect: 1,
    required: true,
    options: [
      { label: "주로 앉아서", emoji: "🪑", sub: "사무·행정 위주" },
      { label: "가볍게 걷기", emoji: "🚶", sub: "실내 이동 포함" },
      { label: "야외 활동 가능", emoji: "🌤️", sub: "야외 근무 가능" },
    ],
  },
  {
    id: "Q4",
    question: "선호하시는 일터의\n환경은 어디인가요?",
    hint: "1개 선택",
    maxSelect: 1,
    required: true,
    options: [
      { label: "실내", emoji: "🏠", sub: "건물 내부 근무" },
      { label: "실외", emoji: "🌳", sub: "야외 근무" },
      { label: "상관없음", emoji: "✨", sub: "모두 괜찮아요" },
    ],
  },
  {
    id: "Q5",
    question: "일주일에 몇 일 정도\n근무하기를 희망하시나요?",
    hint: "1개 선택",
    maxSelect: 1,
    required: true,
    options: [
      { label: "짧게", emoji: "📅", sub: "주 1~3일" },
      { label: "4~5일", emoji: "🗓️", sub: "주 4~5일" },
    ],
  },
  {
    id: "Q6",
    question: "보유 중인 자격증이 있다면\n체크해주세요!",
    hint: "없다면 '다음'을 눌러주세요",
    maxSelect: 10,
    required: false,
    options: [
      {
        label: "사회복지사 1급/2급 자격증",
        emoji: "🏅",
        sub: "사회복지 관련 업무 우대",
      },
      {
        label: "요양보호사 자격증",
        emoji: "🏅",
        sub: "요양·돌봄 업무 우대",
      },
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
        // 마지막 단계 - 결과 화면으로 이동
        await AsyncStorage.setItem("surveyAnswers", JSON.stringify(answers));
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
      containerClassName="bg-background"
      edges={["top", "left", "right"]}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: colors.surface },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.backArrow, { color: colors.foreground }]}>←</Text>
        </Pressable>
        <Text style={[styles.stepText, { color: colors.muted }]}>
          {currentStep + 1} / {totalSteps}
        </Text>
        <View style={styles.backButton} />
      </View>

      {/* 진행 바 */}
      <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: colors.primary,
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
            <Text style={[styles.questionNumber, { color: colors.primary }]}>
              Q{currentStep + 1}
            </Text>
            <Text style={[styles.questionText, { color: colors.foreground }]}>
              {currentQuestion.question}
            </Text>
            <Text style={[styles.hintText, { color: colors.muted }]}>
              {currentQuestion.hint}
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
                      backgroundColor: isSelected ? colors.accent : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <View style={styles.optionTextContainer}>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: isSelected ? colors.primary : colors.foreground },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {option.sub ? (
                      <Text style={[styles.optionSub, { color: colors.muted }]}>
                        {option.sub}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected && (
                    <View
                      style={[
                        styles.checkmark,
                        { backgroundColor: colors.primary },
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
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Pressable
          onPress={handleNext}
          disabled={!isAnswered}
          style={({ pressed }) => [
            styles.nextButton,
            {
              backgroundColor: isAnswered ? colors.primary : colors.inactive,
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
              { color: isAnswered ? "#FFFFFF" : colors.muted },
            ]}
          >
            {isLastStep ? "결과 보기" : "다음"}
          </Text>
          <Text
            style={[
              styles.nextButtonArrow,
              { color: isAnswered ? "#FFFFFF" : colors.muted },
            ]}
          >
            {isLastStep ? "🎯" : "→"}
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
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: 20,
    fontWeight: "600",
  },
  stepText: {
    fontSize: 15,
    fontWeight: "600",
  },
  progressContainer: {
    height: 6,
    marginHorizontal: 20,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  questionContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  questionHeader: {
    marginBottom: 24,
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 34,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  hintText: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 14,
    minHeight: 68,
  },
  optionEmoji: {
    fontSize: 26,
    width: 36,
    textAlign: "center",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
  },
  optionSub: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  checkmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  nextButton: {
    height: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  nextButtonArrow: {
    fontSize: 18,
    fontWeight: "700",
  },
});
