import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Route as RouteIcon } from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getFriendlyErrorMessage } from "@/lib/errorHandler";
import { deleteMyRoadmap, getMyRoadmap, getRoadmapPlacement, saveMyRoadmap, type SaveRoadmapBody } from "@/lib/api/roadmap";
import { RoadmapWizard } from "@/components/roadmap/RoadmapWizard";
import { clearRoadmapDraft } from "@/components/roadmap/roadmapDraft";
import { RoadmapView } from "@/components/roadmap/RoadmapView";

const RoadmapPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const roadmapKey = ["roadmap", user?.id];
  const { data: roadmap, isLoading } = useQuery({
    queryKey: roadmapKey,
    queryFn: getMyRoadmap,
    enabled: !!user,
  });
  const showWizard = editing || (!isLoading && !roadmap);

  const { data: placement } = useQuery({
    queryKey: ["roadmap-placement", user?.id],
    queryFn: getRoadmapPlacement,
    enabled: !!user && showWizard,
    // Vừa làm bài test xong quay lại thì phải thấy kết quả mới
    staleTime: 0,
    refetchOnMount: "always",
  });

  const save = useMutation({
    mutationFn: (body: SaveRoadmapBody) => saveMyRoadmap(body),
    onSuccess: (data) => {
      clearRoadmapDraft();
      queryClient.setQueryData(roadmapKey, data);
      setEditing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const remove = useMutation({
    mutationFn: deleteMyRoadmap,
    onSuccess: () => {
      queryClient.setQueryData(roadmapKey, null);
      setConfirmDelete(false);
      toast({ title: "Đã xóa lộ trình" });
    },
    onError: (err) => toast({ title: "Không xóa được lộ trình", description: getFriendlyErrorMessage(err), variant: "destructive" }),
  });

  return (
    <StudentLayout>
      <div className="w-full max-w-5xl mx-auto space-y-6 font-sans">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2.5">
            <RouteIcon className="w-7 h-7 text-cyan-400" /> Lộ trình học TOEIC
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {showWizard
              ? "Trả lời 3 bước ngắn, hệ thống tính số giờ cần học và chia thành từng chặng cho bạn."
              : "Lộ trình cá nhân theo điểm xuất phát, mục tiêu và thời gian bạn có."}
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="h-80 w-full rounded-3xl" />
        ) : showWizard ? (
          <RoadmapWizard
            existing={roadmap ?? null}
            placement={placement}
            submitting={save.isPending}
            error={save.error ? getFriendlyErrorMessage(save.error) : null}
            onSubmit={(body) => save.mutate(body)}
            onCancel={roadmap ? () => setEditing(false) : undefined}
          />
        ) : roadmap ? (
          <RoadmapView
            roadmap={roadmap}
            onRedo={() => {
              save.reset();
              setEditing(true);
            }}
            onDelete={() => setConfirmDelete(true)}
            deleting={remove.isPending}
          />
        ) : null}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa lộ trình?</AlertDialogTitle>
            <AlertDialogDescription>Lộ trình hiện tại sẽ bị xóa. Bạn có thể tạo lộ trình mới bất cứ lúc nào.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove.mutate()}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudentLayout>
  );
};

export default RoadmapPage;
