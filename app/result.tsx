import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Dimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
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
  { bg: "#EBF5FB", accent: "#2E7D9F" },
  { bg: "#E8F8F5", accent: "#1E8449" },
  { bg: "#FEF9E7", accent: "#B7950B" },
  { bg: "#F5EEF8", accent: "#7D3C98" },
  { bg: "#FDEDEC", accent: "#C0392B" },
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
      <ScreenContainer containerClassName="bg-background" edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>불러오는 중...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (recommendations.length === 0) {
    return (
      <ScreenContainer containerClassName="bg-background" edges={["top", "bottom", "left", "right"]}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            추천 공고를 찾지 못했어요
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            설문 응답을 다시 확인해 주세요
          </Text>
          <Pressable
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.primary },
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
      containerClassName="bg-background"
      edges={["top", "left", "right"]}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={[styles.headerBadge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.headerBadgeText, { color: colors.primary }]}>
            AI 맞춤 추천
          </Text>
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          회원님께 추천드리는{"\n"}일자리예요
        </Text>
        <Text style={[styles.headerSub, { color: colors.muted }]}>
          총 {recommendations.length}개의 공고를 찾았어요 · 좌우로 넘겨보세요
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
                  index === currentIndex ? colors.primary : colors.border,
                width: index === currentIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* 하단 버튼 */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={handleRetry}
          style={({ pressed }) => [
            styles.retryButtonFull,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.retryButtonFullText, { color: colors.foreground }]}>
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
  return (
    <View style={[styles.card, { width: CARD_WIDTH, marginHorizontal: CARD_MARGIN / 2 }]}>
      {/* 카드 내부 */}
      <View style={[styles.cardInner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {job.채용공고명}
          </Text>

          {/* 근무 조건 */}
          <View style={[styles.conditionRow, { backgroundColor: colors.accent }]}>
            <Text style={styles.conditionIcon}>📅</Text>
            <Text style={[styles.conditionText, { color: colors.foreground }]}>
              {job.모집요강}
            </Text>
          </View>

          {/* 구분선 */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* 추천 이유 */}
          <View style={styles.reasonContainer}>
            <Text style={[styles.reasonLabel, { color: colors.muted }]}>
              추천 이유
            </Text>
            <Text style={[styles.reasonText, { color: colors.foreground }]}>
              {job.reason}
            </Text>
          </View>

          {/* 일치율 */}
          {job.matchRate !== undefined && (
            <View style={styles.matchRateContainer}>
              <Text style={[styles.matchRateLabel, { color: colors.muted }]}>
                일치율
              </Text>
              <View style={styles.matchRateBar}>
                <View
                  style={[
                    styles.matchRateFill,
                    {
                      backgroundColor: accentColor,
                      width: `${job.matchRate}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.matchRateValue, { color: accentColor }]}>
                {job.matchRate}%
              </Text>
            </View>
          )}
        </View>

        {/* 카드 하단 카운터 */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.cardCounter, { color: colors.muted }]}>
            {index + 1} / {total}
          </Text>
          <Text style={[styles.cardSwipeHint, { color: colors.muted }]}>
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
    fontSize: 16,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 36,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    lineHeight: 20,
  },
  flatListContent: {
    paddingHorizontal: CARD_MARGIN / 2,
    paddingVertical: 8,
  },
  card: {
    paddingVertical: 4,
  },
  cardInner: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardBanner: {
    padding: 20,
    paddingBottom: 16,
  },
  cardBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  rankText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  cardBannerEmoji: {
    fontSize: 36,
  },
  cardJobType: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardBody: {
    padding: 20,
    gap: 14,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  conditionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  conditionIcon: {
    fontSize: 16,
  },
  conditionText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    lineHeight: 22,
  },
  divider: {
    height: 1,
  },
  reasonContainer: {
    gap: 6,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  reasonText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },
  matchRateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  matchRateLabel: {
    fontSize: 13,
    fontWeight: "600",
    width: 36,
  },
  matchRateBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  matchRateFill: {
    height: "100%",
    borderRadius: 4,
  },
  matchRateValue: {
    fontSize: 14,
    fontWeight: "700",
    width: 36,
    textAlign: "right",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  cardCounter: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardSwipeHint: {
    fontSize: 13,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  retryButtonFull: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonFullText: {
    fontSize: 17,
    fontWeight: "600",
  },
});
