import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Mirrors heroui-native's PressableFeedback: Animated.createAnimatedComponent(Pressable)
// with a built-in press scale driven by a shared value.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ROWS_IN_GROUP = 12;

function usePressScale() {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(pressed.value ? 0.985 : 1, { duration: 150 }) }],
  }));
  const onPressIn = useCallback(() => {
    pressed.value = 1;
  }, [pressed]);
  const onPressOut = useCallback(() => {
    pressed.value = 0;
  }, [pressed]);
  return { style, onPressIn, onPressOut };
}

function Tile({ label, count, selected, onPress }: {
  label: string; count: number; selected: boolean; onPress: () => void;
}) {
  const { style, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.tile, selected && styles.tileSelected, style]}
    >
      <Text style={styles.tileCount}>{count}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

function Row({ index }: { index: number }) {
  const { style, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={() => undefined}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.row, style]}
    >
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>验收事项 {index + 1}</Text>
        <Text style={styles.rowMeta}>mounted in one commit · row {index + 1}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </AnimatedPressable>
  );
}

export default function App() {
  const [showRows, setShowRows] = useState(true);
  const rows = showRows ? ROWS_IN_GROUP : 0;

  // Reanimated activity elsewhere on the screen (as in the reported app: header uses
  // useAnimatedScrollHandler + Animated.View).
  const scrollY = useSharedValue(0);
  const headerStyle = useAnimatedStyle(() => ({ opacity: scrollY.value > 8 ? 0.9 : 1 }));
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.header, headerStyle]}>
        <Text style={styles.headerTitle}>Bulk mount freeze repro</Text>
      </Animated.View>

      <View style={styles.summary}>
        <Tile label="待处理 (12 rows)" count={rows} selected={showRows} onPress={() => setShowRows(true)} />
        <Tile label="待验收 (0 rows)" count={0} selected={!showRows} onPress={() => setShowRows(false)} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.batch}>种子批次 · {rows} 项待处理</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>二层 · 防火门 {rows === 0 ? "0/0" : `0/${rows}`}</Text>
          {rows > 0 ? (
            Array.from({ length: rows }, (_, index) => <Row key={index} index={index} />)
          ) : (
            <Text style={styles.empty}>当前条件下没有匹配的事项</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F2F2F7", paddingTop: 68 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 30, fontWeight: "800", color: "#111111" },
  summary: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  tile: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 16, backgroundColor: "#FFFFFF" },
  tileSelected: { backgroundColor: "#E4E4E9" },
  tileCount: { fontSize: 22, fontWeight: "800", color: "#111111" },
  tileLabel: { fontSize: 12, color: "#6B6B70", textAlign: "center" },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  batch: { fontSize: 15, color: "#6B6B70", marginBottom: 8 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 8 },
  cardTitle: { fontSize: 14, color: "#3F6FD8", marginBottom: 6 },
  empty: { paddingVertical: 24, textAlign: "center", color: "#6B6B70" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F4F4F6",
  },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: "#111111" },
  rowMeta: { fontSize: 12, color: "#8A8A90", marginTop: 2 },
  chevron: { fontSize: 20, color: "#B0B0B6", paddingLeft: 8 },
});
