import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  listListeningStepProgress,
  saveListeningStepProgress,
  type ListeningStepProgressRow,
} from "@/lib/api/learning";
import { PART2_CLUSTERS, PART2_STEPS_META } from "@/data/part2CoachData";

const TOTAL_STEPS = PART2_STEPS_META.length;

export interface ClusterStepProgress {
  completedSteps: number[];
  currentStep: number;
  /** Đã xong đủ 7 bước (ở máy này hoặc đã lưu trên server) */
  isFinished: boolean;
  /** Lần đầu xong đủ 7 bước đã được server ghi nhận */
  finishedOnServer: boolean;
  hasReceivedClusterXp: boolean;
  updatedAt: number;
}

const EMPTY: ClusterStepProgress = {
  completedSteps: [],
  currentStep: 1,
  isFinished: false,
  finishedOnServer: false,
  hasReceivedClusterXp: false,
  updatedAt: 0,
};

const localKey = (userId: string | undefined, clusterId: string) =>
  `lenglish_part2_progress_v2_${userId || "guest"}_${clusterId}`;

interface LocalProgress {
  completedSteps: number[];
  currentStep: number;
  hasReceivedClusterXp: boolean;
  updatedAt: number;
}

function readLocal(userId: string | undefined, clusterId: string): LocalProgress | null {
  try {
    const raw =
      localStorage.getItem(localKey(userId, clusterId)) ??
      localStorage.getItem(`lenglish_part2_progress_v1_${userId || "guest"}_${clusterId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const completed = Array.isArray(parsed.completedSteps)
      ? (parsed.completedSteps as unknown[]).filter(
          (n): n is number => typeof n === "number" && n >= 1 && n <= TOTAL_STEPS,
        )
      : [];
    return {
      completedSteps: completed,
      currentStep:
        parsed.currentStep >= 1 && parsed.currentStep <= TOTAL_STEPS ? parsed.currentStep : 1,
      hasReceivedClusterXp: !!parsed.hasReceivedClusterXp,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

function writeLocal(userId: string | undefined, clusterId: string, value: LocalProgress) {
  try {
    localStorage.setItem(localKey(userId, clusterId), JSON.stringify(value));
  } catch {
    // Trình duyệt chặn bộ nhớ: vẫn còn bản trên server
  }
}

const union = (a: number[], b: number[]) =>
  Array.from(new Set([...a, ...b])).sort((x, y) => x - y);

/**
 * Tiến độ "Luyện nghe từng bước": lưu trên server (đồng bộ giữa các máy) và giữ
 * bản trong trình duyệt để mở nhanh/offline. Hai nguồn được gộp, bước đã xong không bị mất.
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
    (clusterId: string): ClusterStepProgress => {
      const local = readLocal(userId, clusterId);
      const server = serverById.get(clusterId);
      if (!local && !server) return EMPTY;
      const completedSteps = union(local?.completedSteps ?? [], server?.completed_steps ?? []);
      const serverUpdated = server ? Date.parse(server.updated_at) : 0;
      const localUpdated = local?.updatedAt ?? 0;
      return {
        completedSteps,
        currentStep:
          (serverUpdated > localUpdated ? server?.current_step : local?.currentStep) ??
          server?.current_step ??
          1,
        isFinished: completedSteps.length >= TOTAL_STEPS || !!server?.completed_at,
        finishedOnServer: !!server?.completed_at,
        hasReceivedClusterXp: !!local?.hasReceivedClusterXp,
        updatedAt: Math.max(serverUpdated, localUpdated),
      };
    },
    [serverById, userId],
  );

  const saveProgress = useCallback(
    async (
      clusterId: string,
      completedSteps: number[],
      currentStep: number,
      opts?: { hasReceivedClusterXp?: boolean },
    ) => {
      const prev = readLocal(userId, clusterId);
      writeLocal(userId, clusterId, {
        completedSteps: union(prev?.completedSteps ?? [], completedSteps),
        currentStep,
        hasReceivedClusterXp: opts?.hasReceivedClusterXp ?? prev?.hasReceivedClusterXp ?? false,
        updatedAt: Date.now(),
      });
      if (!userId) return null;
      const { data } = await saveListeningStepProgress(clusterId, completedSteps, currentStep);
      if (data) {
        queryClient.setQueryData<ListeningStepProgressRow[]>(queryKey, (old) => [
          data,
          ...(old ?? []).filter((r) => r.cluster_id !== clusterId),
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
    for (const cluster of PART2_CLUSTERS) {
      const local = readLocal(userId, cluster.id);
      if (!local || local.completedSteps.length === 0) continue;
      const serverSteps = serverById.get(cluster.id)?.completed_steps ?? [];
      if (local.completedSteps.every((s) => serverSteps.includes(s))) continue;
      void saveListeningStepProgress(cluster.id, local.completedSteps, local.currentStep).then(
        ({ data }) => {
          if (!data) return;
          queryClient.setQueryData<ListeningStepProgressRow[]>(queryKey, (old) => [
            data,
            ...(old ?? []).filter((r) => r.cluster_id !== cluster.id),
          ]);
        },
      );
    }
  }, [isFetched, queryClient, queryKey, serverById, userId]);

  return { getProgress, saveProgress, isLoaded: !userId || isFetched };
}
