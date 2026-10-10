import React, { useState, useMemo } from 'react';
import { Part2Cluster } from '@/types/part2Coach';
import { PART2_CLUSTERS } from '@/data/part2CoachData';
import { getCleanClusterInfo } from './Part2HubView';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Check, Headphones, Layers, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Part2ClusterSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClusterId: string;
  onSelectCluster: (cluster: Part2Cluster) => void;
}

export const Part2ClusterSelector: React.FC<Part2ClusterSelectorProps> = ({
  isOpen,
  onOpenChange,
  selectedClusterId,
  onSelectCluster,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 25 clusters indexed and sorted in strict sequential order 1 -> 25
  const orderedClusters = useMemo(() => {
    return PART2_CLUSTERS.map((c, idx) => ({
      ...c,
      info: getCleanClusterInfo(c, idx)
    }));
  }, []);

  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return orderedClusters;
    const q = searchQuery.toLowerCase();
    return orderedClusters.filter((c) => {
      const matchTitle = c.info.formattedTitle.toLowerCase().includes(q);
      const matchDesc = c.info.cleanDescription.toLowerCase().includes(q);
      const matchNumber = String(c.info.sequentialNumber).includes(q);
      return matchTitle || matchDesc || matchNumber;
    });
  }, [orderedClusters, searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-6 sm:p-7 rounded-3xl border-2 space-y-5 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-2 text-left border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
              <Layers className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
              Chọn Bài Luyện Phản Xạ Part 2
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm font-medium text-muted-foreground">
            Danh sách {PART2_CLUSTERS.length} bài luyện tập được chia nhỏ và sắp xếp theo độ khó tăng dần.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm theo số bài, chủ đề..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Clusters List in Strict Sequential Order */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {filteredClusters.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Không tìm thấy bài luyện nào phù hợp với tìm kiếm.
            </div>
          ) : (
            filteredClusters.map((cluster) => {
              const isSelected = cluster.id === selectedClusterId;
              const padIndex = String(cluster.info.sequentialNumber).padStart(2, '0');

              return (
                <div
                  key={cluster.id}
                  onClick={() => {
                    onSelectCluster(cluster);
                    onOpenChange(false);
                  }}
                  className={cn(
                    'p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative space-y-2',
                    isSelected
                      ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/40 ring-1 ring-purple-600/30 shadow-md'
                      : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-300 dark:hover:border-purple-900/60'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300">
                          Bài {padIndex}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-muted-foreground">
                          {cluster.difficulty.includes('650') ? 'Nâng cao (650+)' : 'Cơ bản (500+)'}
                        </span>
                      </div>

                      <h4 className="text-base sm:text-lg font-black text-foreground">
                        {cluster.info.formattedTitle}
                      </h4>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-xl font-black text-xs">
                      <Headphones className="w-3.5 h-3.5" />
                      <span>{cluster.questions.length} câu</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="pt-2 flex items-center gap-1.5 text-xs font-black text-purple-600 dark:text-purple-400">
                      <Check className="w-4 h-4" />
                      <span>Đang luyện tập bài này</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Part2ClusterSelector;
