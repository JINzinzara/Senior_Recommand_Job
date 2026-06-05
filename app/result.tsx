import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Linking,
  Alert,
} from "react-native";
import { Text } from "@/components/text";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import type { JobRecommendation } from "@/lib/recommendation";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_MARGIN = 20;
const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2;

// 직종별 이모지 매핑
const GROUP_EMOJI: Record<string, string> = {
  "돌봄·복지": "🤝",
  "보육": "👶",
  "환경·청소": "🧹",
  "경비·안전": "🔒",
  "시장·판매": "🛒",
  "행정·사무": "📋",
  "교육·문화": "📚",
  "식품가공": "🍱",
  "농업": "🌱",
};

const JOB_COLORS = [
  { bg: "#FEF9F3", accent: "#D4A574" },
  { bg: "#FEF9F3", accent: "#C89860" },
  { bg: "#FEF9F3", accent: "#B8874C" },
  { bg: "#FEF9F3", accent: "#A87638" },
  { bg: "#FEF9F3", accent: "#986524" },
];

export default function ResultScreen() {
  const router = useRouter();
  const colors = useColors();
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const stored = await AsyncStorage.getItem("recommendationResult");
        if (stored) {
          const result = JSON.parse(stored);
          setRecommendations(result.recommendations ?? []);
        }
      } catch (e) {
        console.error("Failed to load results:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadResults();
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / CARD_WIDTH);
    if (index !== currentIndex) {
      setCurrentIndex(index);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleRetry = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await AsyncStorage.removeItem("surveyAnswers");
    await AsyncStorage.removeItem("recommendationResult");
    // @ts-ignore
    router.replace("/");
  };

  if (!isLoaded) {
    return (
      <ScreenContainer containerClassName="bg-white" edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: "#8B6F47" }]}>불러오는 중...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (recommendations.length === 0) {
    return (
      <ScreenContainer containerClassName="bg-white" edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: "#5C3D2E" }]}>
            추천 공고를 찾지 못했어요
          </Text>
          <Text style={[styles.emptyDesc, { color: "#8B6F47" }]}>
            설문 응답을 다시 확인해 주세요
          </Text>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: "#D4A574" },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.retryButtonText}>다시 설문하기</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      containerClassName="bg-white"
      edges={["top", "left", "right"]}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={[styles.headerBadge, { backgroundColor: "#F5E6D3" }]}>
          <Text style={[styles.headerBadgeText, { color: "#D4A574" }]}>
            AI 맞춤 추천
          </Text>
        </View>
        <Text style={[styles.headerTitle, { color: "#5C3D2E" }]}>
          회원님께 추천드리는{"\n"}일자리예요
        </Text>
        <Text style={[styles.headerSub, { color: "#8B6F47" }]}>
          총 {recommendations.length}개의 공고 · 좌우로 넘겨보세요
        </Text>
      </View>

      {/* 카드 슬라이더 */}
      <FlatList
        ref={flatListRef}
        data={recommendations}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.flatListContent}
        keyExtractor={(item) => item.rank.toString()}
        renderItem={({ item, index }) => {
          const colorScheme = JOB_COLORS[index % JOB_COLORS.length];
          return (
            <JobCard
              job={item}
              index={index}
              total={recommendations.length}
              bgColor={colorScheme.bg}
              accentColor={colorScheme.accent}
              colors={colors}
            />
          );
        }}
      />

      {/* 페이지 인디케이터 */}
      <View style={styles.indicatorContainer}>
        {recommendations.map((_, index) => (
          <Pressable
            key={index}
            onPress={() => {
              flatListRef.current?.scrollToIndex({ index, animated: true });
              setCurrentIndex(index);
            }}
            style={[
              styles.indicator,
              {
                backgroundColor:
                  index === currentIndex ? "#D4A574" : "#E8D4B8",
                width: index === currentIndex ? 28 : 10,
              },
            ]}
          />
        ))}
      </View>

      {/* 하단 버튼 */}
      <View style={[styles.bottomBar, { borderTopColor: "#E8D4B8" }]}>
        <Pressable
          onPress={handleRetry}
          style={({ pressed }) => [
            styles.retryButtonFull,
            { backgroundColor: "#FFFFFF", borderColor: "#E8D4B8" },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.retryButtonFullText, { color: "#5C3D2E" }]}>
            🔄 다시 설문하기
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

function JobCard({
  job,
  index,
  total,
  bgColor,
  accentColor,
  colors,
}: {
  job: JobRecommendation;
  index: number;
  total: number;
  bgColor: string;
  accentColor: string;
  colors: ReturnType<typeof useColors>;
}) {
  const handleApply = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (job.contTel) {
      // 전화번호 있으면 전화/문자 선택
      Alert.alert(
        job.채용공고명,
        `📞 ${job.contTel}`,
        [
          {
            text: "전화하기",
            onPress: () => Linking.openURL(`tel:${job.contTel}`),
          },
          {
            text: "문자 보내기",
            onPress: () => Linking.openURL(`sms:${job.contTel}`),
          },
          { text: "취소", style: "cancel" },
        ]
      );
    } else if (job.링크) {
      // 전화번호 없으면 공고 페이지 이동
      Linking.openURL(job.링크);
    } else {
      Alert.alert("안내", "지원 정보를 찾을 수 없습니다.");
    }
  };

  return (
    <View style={[styles.card, { width: CARD_WIDTH, marginHorizontal: CARD_MARGIN / 2 }]}>
      {/* 카드 내부 */}
      <View style={[styles.cardInner, { backgroundColor: "#FFFFFF", borderColor: "#E8D4B8" }]}>
        {/* 카드 상단 색상 배너 */}
        <View style={[styles.cardBanner, { backgroundColor: bgColor }]}>
          <View style={styles.cardBannerContent}>
            <View style={[styles.rankBadge, { backgroundColor: accentColor }]}>
              <Text style={styles.rankText}>#{job.rank}</Text>
            </View>
            <Text style={styles.cardBannerEmoji}>💼</Text>
          </View>
          <Text style={[styles.cardJobType, { color: accentColor }]}>
            {job.모집직종}
          </Text>
        </View>

        {/* 카드 본문 */}
        <View style={styles.cardBody}>
          {/* 공고명 */}
          <Text style={[styles.cardTitle, { color: "#5C3D2E" }]}>
            {job.채용공고명}
          </Text>

          {/* 근무 조건 */}
          <View style={[styles.conditionRow, { backgroundColor: "#F5E6D3" }]}>
            <Text style={styles.conditionIcon}>📅</Text>
            <Text style={[styles.conditionText, { color: "#5C3D2E" }]}>
              {job.모집요강}
            </Text>
          </View>

          {/* 구분선 */}
          <View style={[styles.divider, { backgroundColor: "#E8D4B8" }]} />

          {/* 추천 이유 */}
          <View style={styles.reasonContainer}>
            <Text style={[styles.reasonLabel, { color: "#8B6F47" }]}>
              추천 이유
            </Text>
            <Text style={[styles.reasonText, { color: "#5C3D2E" }]}>
              {job.reason}
            </Text>
          </View>

        </View>

        {/* 지원하기 버튼 */}
        <View style={styles.applyContainer}>
          <Pressable
            onPress={handleApply}
            style={({ pressed }) => [
              styles.applyButton,
              { backgroundColor: accentColor },
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
            ]}
          >
            <Text style={styles.applyButtonText}>
              {job.contTel ? "📞 지원하기" : "📋 공고 보기"}
            </Text>
          </Pressable>
        </View>

        {/* 카드 하단 카운터 */}
        <View style={[styles.cardFooter, { borderTopColor: "#E8D4B8" }]}>
          <Text style={[styles.cardCounter, { color: "#8B6F47" }]}>
            {index + 1} / {total}
          </Text>
          <Text style={[styles.cardSwipeHint, { color: "#8B6F47" }]}>
            {index < total - 1 ? "다음 공고 →" : "마지막 공고"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
  },
  emptyEmoji: {
    fontSize: 68,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
  },
  retryButton: {
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 22,
    marginBottom: 14,
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    lineHeight: 40,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 16,
    lineHeight: 24,
  },
  flatListContent: {
    paddingHorizontal: CARD_MARGIN / 2,
    paddingVertical: 8,
  },
  card: {
    paddingVertical: 4,
  },
  cardInner: {
    borderRadius: 26,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBanner: {
    padding: 22,
    paddingBottom: 18,
  },
  cardBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rankBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  rankText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  cardBannerEmoji: {
    fontSize: 40,
  },
  cardJobType: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardBody: {
    padding: 22,
    gap: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  conditionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  conditionIcon: {
    fontSize: 18,
  },
  conditionText: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    lineHeight: 24,
  },
  divider: {
    height: 1,
  },
  reasonContainer: {
    gap: 8,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  reasonText: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "600",
  },
  applyContainer: {
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  applyButton: {
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  cardCounter: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardSwipeHint: {
    fontSize: 15,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  indicator: {
    height: 10,
    borderRadius: 5,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  retryButtonFull: {
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonFullText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
