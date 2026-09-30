import React, { useState } from 'react';
import { Part2Cluster } from '@/types/part2Coach';
import { PART2_CLUSTERS } from '@/data/part2CoachData';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sparkles, Check, Headphones, BookOpen, Layers, Search, FileCheck2, Filter } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'all' | 'fulltest' | 'dictation'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClusters = PART2_CLUSTERS.filter((c) => {
    if (activeTab === 'fulltest' && c.sourceType !== 'fulltest') return false;
    if (activeTab === 'dictation' && c.sourceType !== 'dictation') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchSource = c.testSource.toLowerCase().includes(q);
      const matchDesc = c.description.toLowerCase().includes(q);
      return matchTitle || matchSource || matchDesc;
    }
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-6 sm:p-7 rounded-3xl border-2 space-y-5 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-2 text-left border-b pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
              <Layers className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
              Chọn Cụm Câu Hỏi Phản Xạ Part 2
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm font-medium text-muted-foreground">
            Tổng hợp {PART2_CLUSTERS.length} cụm câu hỏi từ Đề thi Fulltest thật và Bài luyện nghe điền từ.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Tabs */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo tên đề, cụm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer border',
                activeTab === 'all'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
              )}
            >
              Tất cả ({PART2_CLUSTERS.length})
            </button>
            <button
              onClick={() => setActiveTab('fulltest')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer border flex items-center gap-1.5',
                activeTab === 'fulltest'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
              )}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              Đề Thi Fulltest ({PART2_CLUSTERS.filter((c) => c.sourceType === 'fulltest').length})
            </button>
            <button
              onClick={() => setActiveTab('dictation')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer border flex items-center gap-1.5',
                activeTab === 'dictation'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
              )}
            >
              <Headphones className="w-3.5 h-3.5" />
              Nghe Điền Từ ({PART2_CLUSTERS.filter((c) => c.sourceType === 'dictation').length})
            </button>
          </div>
        </div>

        {/* Clusters List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {filteredClusters.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Không tìm thấy cụm câu hỏi nào phù hợp với tìm kiếm.
            </div>
          ) : (
            filteredClusters.map((cluster) => {
              const isSelected = cluster.id === selectedClusterId;
              const isFulltest = cluster.sourceType === 'fulltest';
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
                        <span
                          className={cn(
                            'text-xs font-black uppercase px-2 py-0.5 rounded-md border tracking-wider',
                            isFulltest
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400'
                          )}
                        >
                          {cluster.testSource}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-muted-foreground">
                          {cluster.difficulty}
                        </span>
                      </div>

                      <h4 className="text-base sm:text-lg font-black text-foreground">
                        {cluster.title}
                      </h4>

                      <p className="text-xs sm:text-sm text-muted-foreground font-medium line-clamp-2">
                        {cluster.description}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-xl font-black text-xs">
                      <Headphones className="w-3.5 h-3.5" />
                      <span>{cluster.questions.length} câu</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="pt-2 flex items-center gap-1.5 text-xs font-black text-purple-600 dark:text-purple-400">
                      <Check className="w-4 h-4" />
                      <span>Đang luyện tập cụm này</span>
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
