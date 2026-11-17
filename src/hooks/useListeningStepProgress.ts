import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  listListeningStepProgress,
  saveListeningStepProgress,
  type ListeningStepProgressRow,
} from "@/lib/api/learning";
import { getFlow } from "@/data/listeningFlows";
import { LISTENING_UNITS, normalizeLegacySteps, progressKeyOf } from "@/data/listeningUnits";
import type { Part2Cluster } from "@/types/part2Coach";

type UnitRef = Pick<Part2Cluster, "id" | "part">;

export interface ClusterStepProgress {
  completedSteps: number[];
  currentStep: number;
  /** Số bước của bài (theo Part, D17) */
  totalSteps: number;
  /** Đã xong đủ các bước (ở máy này hoặc đã lưu trên server) */
  isFinished: boolean;
  /** Lần đầu xong đủ các bước đã được server ghi nhận */
  finishedOnServer: boolean;
  hasReceivedClusterXp: boolean;
  updatedAt: number;
}

const localKey = (userId: string | undefined, key: string) =>
  `lenglish_part2_progress_v2_${userId || "guest"}_${key}`;

interface LocalProgress {
  completedSteps: number[];
  currentStep: number;
  hasReceivedClusterXp: boolean;
  updatedAt: number;
}

function readLocal(userId: string | undefined, key: string): LocalProgress | null {
  try {
    const raw =
      localStorage.getItem(localKey(userId, key)) ??
      localStorage.getItem(`lenglish_part2_progress_v1_${userId || "guest"}_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const completed = Array.isArray(parsed.completedSteps)
      ? (parsed.completedSteps as unknown[]).filter(
          (n): n is number => typeof n === "number" && n >= 1 && n <= 7,
        )
      : [];
    return {
      completedSteps: completed,
      currentStep: typeof parsed.currentStep === "number" ? parsed.currentStep : 1,
      hasReceivedClusterXp: !!parsed.hasReceivedClusterXp,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

function writeLocal(userId: string | undefined, key: string, value: LocalProgress) {
  try {
    localStorage.setItem(localKey(userId, key), JSON.stringify(value));
  } catch {
    // Trình duyệt chặn bộ nhớ: vẫn còn bản trên server
  }
}

const union = (a: number[], b: number[]) =>
  Array.from(new Set([...a, ...b])).sort((x, y) => x - y);

const clampStep = (step: number | undefined, total: number) =>
  step && step >= 1 ? Math.min(step, total) : 1;

/**
 * Tiến độ "Luyện nghe từng bước": lưu trên server (đồng bộ giữa các máy) và giữ
 * bản trong trình duyệt để mở nhanh/offline. Hai nguồn được gộp, bước đã xong không bị mất.
 * Từ D17 mỗi Part có số bước riêng; khóa lưu theo `progressKeyOf`.
 */
export function useListeningStepProgress() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["listening-step-progress", userId] as const, [userId]);

  const { data: serverRows, isFetched } = useQuery({
    queryKey,
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await listListeningStepProgress();
      if (error) throw error;
      return data ?? [];
    },
  });

  const serverById = useMemo(() => {
    const map = new Map<string, ListeningStepProgressRow>();
    for (const row of serverRows ?? []) map.set(row.cluster_id, row);
    return map;
  }, [serverRows]);

  const getProgress = useCallback(
    (unit: UnitRef): ClusterStepProgress => {
      const key = progressKeyOf(unit);
      const totalSteps = getFlow(unit.part).length;
      const local = readLocal(userId, key);
      const server = serverById.get(key);
      const completedSteps = normalizeLegacySteps(
        unit.part,
        union(local?.completedSteps ?? [], server?.completed_steps ?? []),
        totalSteps,
      );
      const serverUpdated = server ? Date.parse(server.updated_at) : 0;
      const localUpdated = local?.updatedAt ?? 0;
      const rawCurrent =
        (serverUpdated > localUpdated ? server?.current_step : local?.currentStep) ??
        server?.current_step;
      return {
        completedSteps,
        currentStep: clampStep(rawCurrent, totalSteps),
        totalSteps,
        isFinished: completedSteps.length >= totalSteps || !!server?.completed_at,
        finishedOnServer: !!server?.completed_at,
        hasReceivedClusterXp: !!local?.hasReceivedClusterXp,
        updatedAt: Math.max(serverUpdated, localUpdated),
      };
    },
    [serverById, userId],
  );

  const saveProgress = useCallback(
    async (
      unit: UnitRef,
      completedSteps: number[],
      currentStep: number,
      opts?: { hasReceivedClusterXp?: boolean },
    ) => {
      const key = progressKeyOf(unit);
      const totalSteps = getFlow(unit.part).length;
      const prev = readLocal(userId, key);
      writeLocal(userId, key, {
        completedSteps: union(prev?.completedSteps ?? [], completedSteps),
        currentStep,
        hasReceivedClusterXp: opts?.hasReceivedClusterXp ?? prev?.hasReceivedClusterXp ?? false,
        updatedAt: Date.now(),
      });
      if (!userId) return null;
      const { data } = await saveListeningStepProgress(key, completedSteps, currentStep, totalSteps);
      if (data) {
        queryClient.setQueryData<ListeningStepProgressRow[]>(queryKey, (old) => [
          data,
          ...(old ?? []).filter((r) => r.cluster_id !== key),
        ]);
      }
      return data;
    },
    [queryClient, queryKey, userId],
  );

  // Lần đầu có dữ liệu server: đẩy tiến độ cũ chỉ có trong trình duyệt lên server
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || !isFetched || syncedFor.current === userId) return;
    syncedFor.current = userId;
    for (const unit of LISTENING_UNITS) {
      const key = progressKeyOf(unit);
      const local = readLocal(userId, key);
      if (!local || local.completedSteps.length === 0) continue;
      const serverSteps = serverById.get(key)?.completed_steps ?? [];
      if (local.completedSteps.every((s) => serverSteps.includes(s))) continue;
      const totalSteps = getFlow(unit.part).length;
      void saveListeningStepProgress(
        key,
        local.completedSteps,
        clampStep(local.currentStep, totalSteps),
        totalSteps,
      ).then(({ data }) => {
        if (!data) return;
        queryClient.setQueryData<ListeningStepProgressRow[]>(queryKey, (old) => [
          data,
          ...(old ?? []).filter((r) => r.cluster_id !== key),
        ]);
      });
    }
  }, [isFetched, queryClient, queryKey, serverById, userId]);

  return { getProgress, saveProgress, isLoaded: !userId || isFetched };
}
