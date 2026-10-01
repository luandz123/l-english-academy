import React, { useState, useEffect, useMemo, useRef } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { 
  Gamepad2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Copy, 
  RotateCcw, 
  Save, 
  Upload, 
  Download, 
  Volume2, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Database,
  ArrowUpDown,
  Eye,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VocabTopic, VocabWord } from '@/components/game/WordShooter/types';
import { 
  getVocabPacks, 
  saveVocabPacks, 
  resetVocabPacksToDefault, 
  parseBulkWordsText 
} from '@/services/vocabPacksService';
import { TOEIC_600_MASTER_PACK, TOEIC_THEMATIC_PACKS, TOEIC_600_ALL_WORDS } from '@/data/toeic600Data';
import { cn } from '@/lib/utils';

export default function AdminVocabPacks() {
  const { toast } = useToast();

  // Core state
  const [packs, setPacks] = useState<VocabTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Pack Edit/Create Modal
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<VocabTopic | null>(null);
  const [packName, setPackName] = useState('');
  const [packIcon, setPackIcon] = useState('📚');
  const [packDescription, setPackDescription] = useState('');

  // Pack Details / Word List Drawer Modal
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [wordSearchQuery, setWordSearchQuery] = useState('');

  // Single Word Add/Edit
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<VocabWord | null>(null);
  const [wordText, setWordText] = useState('');
  const [wordPhonetic, setWordPhonetic] = useState('');
  const [wordDefinition, setWordDefinition] = useState('');

  // Bulk Import Modal
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // System DB Import Modal
  const [isDbImportOpen, setIsDbImportOpen] = useState(false);
  const [dbSearch, setDbSearch] = useState('');
  const [dbWords, setDbWords] = useState<any[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [selectedDbWordIds, setSelectedDbWordIds] = useState<Set<number>>(new Set());

  // Delete confirmations
  const [packToDelete, setPackToDelete] = useState<VocabTopic | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // TOEIC 600 Modal
  const [isToeicModalOpen, setIsToeicModalOpen] = useState(false);
  const [toeicPreviewSearch, setToeicPreviewSearch] = useState('');

  // Active Pack reference
  const activePack = useMemo(() => {
    return packs.find((p) => p.id === activePackId) || null;
  }, [packs, activePackId]);

  // Load initial packs
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await getVocabPacks();
        setPacks(data);
      } catch (err) {
        console.error(err);
        toast({
          title: 'Lỗi nạp dữ liệu',
          description: 'Không thể tải bộ từ vựng, đã nạp bộ mặc định.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [toast]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalPacks = packs.length;
    const totalWords = packs.reduce((acc, p) => acc + (p.words?.length || 0), 0);
    const avgWords = totalPacks > 0 ? Math.round(totalWords / totalPacks) : 0;
    return { totalPacks, totalWords, avgWords };
  }, [packs]);

  // Filtered packs
  const filteredPacks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return packs;
    return packs.filter((p) => 
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.words.some((w) => w.word.toLowerCase().includes(q) || w.definition_vi.toLowerCase().includes(q))
    );
  }, [packs, searchQuery]);

  // Filtered words in active pack
  const filteredWords = useMemo(() => {
    if (!activePack) return [];
    const q = wordSearchQuery.toLowerCase().trim();
    if (!q) return activePack.words;
    return activePack.words.filter((w) => 
      w.word.toLowerCase().includes(q) ||
      w.definition_vi.toLowerCase().includes(q) ||
      (w.phonetic && w.phonetic.toLowerCase().includes(q))
    );
  }, [activePack, wordSearchQuery]);

  // Save to Cloud & Local
  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      const res = await saveVocabPacks(packs);
      if (res.success) {
        setHasUnsavedChanges(false);
        toast({
          title: 'Đã lưu thành công! 🎉',
          description: 'Các bộ từ vựng đã được đồng bộ lên Supabase và có hiệu lực ngay trong game.',
        });
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast({
        title: 'Lưu thất bại',
        description: err.message || 'Không thể lưu lên Supabase',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Open Create Pack modal
  const handleOpenCreatePack = () => {
    setEditingPack(null);
    setPackName('');
    setPackIcon('🎯');
    setPackDescription('');
    setIsPackModalOpen(true);
  };

  // Open Edit Pack modal
  const handleOpenEditPack = (pack: VocabTopic, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingPack(pack);
    setPackName(pack.name);
    setPackIcon(pack.icon || '📚');
    setPackDescription(pack.description || '');
    setIsPackModalOpen(true);
  };

  // Submit Pack Modal (Create / Update)
  const handleSubmitPackModal = () => {
    if (!packName.trim()) {
      toast({ title: 'Vui lòng nhập tên bộ từ vựng', variant: 'destructive' });
      return;
    }

    if (editingPack) {
      // Update
      setPacks((prev) =>
        prev.map((p) =>
          p.id === editingPack.id
            ? { ...p, name: packName.trim(), icon: packIcon.trim() || '📚', description: packDescription.trim() }
            : p
        )
      );
      toast({ title: 'Đã cập nhật thông tin bộ từ vựng' });
    } else {
      // Create
      const newPack: VocabTopic = {
        id: `pack_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: packName.trim(),
        icon: packIcon.trim() || '🎯',
        description: packDescription.trim(),
        words: [],
        isCustom: true,
      };
      setPacks((prev) => [newPack, ...prev]);
      toast({ title: 'Đã tạo bộ từ vựng mới!' });
    }

    setHasUnsavedChanges(true);
    setIsPackModalOpen(false);
  };

  // Clone a pack
  const handleClonePack = (pack: VocabTopic, e: React.MouseEvent) => {
    e.stopPropagation();
    const cloned: VocabTopic = {
      ...pack,
      id: `pack_clone_${Date.now()}`,
      name: `${pack.name} (Bản sao)`,
      words: pack.words.map((w) => ({
        ...w,
        id: `w_clone_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      })),
      isCustom: true,
    };
    setPacks((prev) => [cloned, ...prev]);
    setHasUnsavedChanges(true);
    toast({ title: `Đã nhân bản bộ từ "${pack.name}"` });
  };

  // Delete Pack confirmation
  const handleConfirmDeletePack = () => {
    if (!packToDelete) return;
    setPacks((prev) => prev.filter((p) => p.id !== packToDelete.id));
    if (activePackId === packToDelete.id) {
      setActivePackId(null);
    }
    setHasUnsavedChanges(true);
    setPackToDelete(null);
    toast({ title: `Đã xóa bộ từ "${packToDelete.name}"` });
  };

  // TOEIC 600 Handlers
  const handleImportToeicMaster = () => {
    setPacks((prev) => {
      const filtered = prev.filter((p) => p.id !== 'toeic_600_master');
      return [TOEIC_600_MASTER_PACK, ...filtered];
    });
    setHasUnsavedChanges(true);
    setIsToeicModalOpen(false);
    toast({
      title: 'Đã nạp bộ 600 Từ Vựng TOEIC Căn Bản (Toàn Tập)!',
      description: 'Gói 600 từ đã được thêm vào hệ thống. Hãy bấm "Lưu & Đồng Bộ Hệ Thống" để lưu lên Cloud.',
    });
  };

  const handleImportToeicThematic = () => {
    setPacks((prev) => {
      const thematicIds = new Set(TOEIC_THEMATIC_PACKS.map((t) => t.id));
      const remaining = prev.filter((p) => !thematicIds.has(p.id));
      return [...TOEIC_THEMATIC_PACKS, ...remaining];
    });
    setHasUnsavedChanges(true);
    setIsToeicModalOpen(false);
    toast({
      title: 'Đã nạp 9 Bộ Chuyên Đề TOEIC (Tổng 600 từ)!',
      description: '9 bộ theo các lĩnh vực đã được thêm vào danh sách.',
    });
  };

  const handleDownloadToeicJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify([TOEIC_600_MASTER_PACK, ...TOEIC_THEMATIC_PACKS], null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', '600_essential_words_toeic.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast({ title: 'Đã tải xuống file 600_essential_words_toeic.json' });
  };

  // Reset to default packs
  const handleResetToDefault = async () => {
    setIsResetConfirmOpen(false);
    setIsSaving(true);
    try {
      const res = await resetVocabPacksToDefault();
      if (res.success) {
        const fresh = await getVocabPacks();
        setPacks(fresh);
        setHasUnsavedChanges(false);
        setActivePackId(null);
        toast({
          title: 'Khôi phục thành công',
          description: 'Đã đưa tất cả bộ từ vựng về cài đặt chuẩn ban đầu của học viện.',
        });
      }
    } catch (err: any) {
      toast({ title: 'Lỗi khôi phục', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // Play TTS pronunciation
  const playWordTTS = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  // Open Single Word Modal
  const handleOpenAddWord = () => {
    setEditingWord(null);
    setWordText('');
    setWordPhonetic('');
    setWordDefinition('');
    setIsWordModalOpen(true);
  };

  const handleOpenEditWord = (w: VocabWord) => {
    setEditingWord(w);
    setWordText(w.word);
    setWordPhonetic(w.phonetic || '');
    setWordDefinition(w.definition_vi);
    setIsWordModalOpen(true);
  };

  // Submit Single Word
  const handleSubmitWord = () => {
    if (!wordText.trim()) {
      toast({ title: 'Vui lòng nhập từ vựng tiếng Anh', variant: 'destructive' });
      return;
    }
    if (!activePackId) return;

    let cleanPhonetic = wordPhonetic.trim();
    if (cleanPhonetic && !cleanPhonetic.startsWith('/')) {
      cleanPhonetic = `/${cleanPhonetic}/`;
    }

    if (editingWord) {
      // Update word
      setPacks((prev) =>
        prev.map((p) => {
          if (p.id !== activePackId) return p;
          return {
            ...p,
            words: p.words.map((w) =>
              w.id === editingWord.id
                ? {
                    ...w,
                    word: wordText.trim().toLowerCase(),
                    phonetic: cleanPhonetic || null,
                    definition_vi: wordDefinition.trim(),
                  }
                : w
            ),
          };
        })
      );
      toast({ title: `Đã cập nhật từ "${wordText.trim()}"` });
    } else {
      // Add new word
      const newWordItem: VocabWord = {
        id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        word: wordText.trim().toLowerCase(),
        phonetic: cleanPhonetic || null,
        definition_vi: wordDefinition.trim(),
      };
      setPacks((prev) =>
        prev.map((p) => {
          if (p.id !== activePackId) return p;
          return {
            ...p,
            words: [newWordItem, ...p.words],
          };
        })
      );
      toast({ title: `Đã thêm từ "${wordText.trim()}" vào bộ từ` });
    }

    setHasUnsavedChanges(true);
    setIsWordModalOpen(false);
  };

  // Delete single word
  const handleDeleteWord = (wordId: string | number) => {
    if (!activePackId) return;
    setPacks((prev) =>
      prev.map((p) => {
        if (p.id !== activePackId) return p;
        return {
          ...p,
          words: p.words.filter((w) => w.id !== wordId),
        };
      })
    );
    setHasUnsavedChanges(true);
    toast({ title: 'Đã xóa từ vựng khỏi bộ từ' });
  };

  // Bulk Import Submit
  const handleBulkImportSubmit = () => {
    if (!bulkInputText.trim() || !activePackId) return;

    const parsed = parseBulkWordsText(bulkInputText);
    if (parsed.length === 0) {
      toast({
        title: 'Không nhận diện được từ vựng',
        description: 'Vui lòng kiểm tra định dạng văn bản (ví dụ: word - nghĩa - phiên âm)',
        variant: 'destructive',
      });
      return;
    }

    setPacks((prev) =>
      prev.map((p) => {
        if (p.id !== activePackId) return p;
        // Avoid adding duplicate words
        const existingWords = new Set(p.words.map((w) => w.word.toLowerCase()));
        const newToAdd = parsed.filter((w) => !existingWords.has(w.word.toLowerCase()));

        return {
          ...p,
          words: [...p.words, ...newToAdd],
        };
      })
    );

    setHasUnsavedChanges(true);
    setIsBulkImportOpen(false);
    setBulkInputText('');
    toast({
      title: `Nhập thành công ${parsed.length} từ vựng!`,
      description: 'Các từ đã được thêm vào bộ từ hiện tại.',
    });
  };

  // File Upload (CSV/TXT) for bulk import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setBulkInputText(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export JSON file backup
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(packs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vocab_packs_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast({ title: 'Đã tải xuống file sao lưu JSON' });
  };

  // Import JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name && parsed[0].words) {
          setPacks(parsed);
          setHasUnsavedChanges(true);
          toast({
            title: 'Nạp file JSON thành công!',
            description: `Đã tải ${parsed.length} bộ từ vựng từ file sao lưu.`,
          });
        } else {
          throw new Error('Cấu trúc file JSON không hợp lệ');
        }
      } catch (err: any) {
        toast({
          title: 'Lỗi đọc file JSON',
          description: err.message || 'File không đúng định dạng',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Open System Database Search
  const handleOpenDbImport = async () => {
    setIsDbImportOpen(true);
    setSelectedDbWordIds(new Set());
    fetchDbWords();
  };

  const fetchDbWords = async () => {
    setIsLoadingDb(true);
    try {
      let query = supabase
        .from('vocab_questions')
        .select('id, word, phonetic, definition_vi, example_sentence')
        .not('word', 'is', null)
        .order('id', { ascending: false })
        .limit(60);

      if (dbSearch.trim()) {
        query = query.ilike('word', `%${dbSearch.trim()}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        setDbWords(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const handleToggleSelectDbWord = (id: number) => {
    setSelectedDbWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirmDbImport = () => {
    if (!activePackId || selectedDbWordIds.size === 0) return;

    const wordsToAdd: VocabWord[] = dbWords
      .filter((w) => selectedDbWordIds.has(w.id))
      .map((w) => ({
        id: `db_${w.id}_${Date.now()}`,
        word: w.word.trim().toLowerCase(),
        phonetic: w.phonetic,
        definition_vi: w.definition_vi || '',
      }));

    setPacks((prev) =>
      prev.map((p) => {
        if (p.id !== activePackId) return p;
        const existingSet = new Set(p.words.map((item) => item.word.toLowerCase()));
        const filtered = wordsToAdd.filter((item) => !existingSet.has(item.word.toLowerCase()));
        return {
          ...p,
          words: [...p.words, ...filtered],
        };
      })
    );

    setHasUnsavedChanges(true);
    setIsDbImportOpen(false);
    toast({
      title: `Đã nạp ${selectedDbWordIds.size} từ vựng từ ngân hàng hệ thống!`,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-20">
        {/* Top Header & Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-card p-6 rounded-2xl border border-border/70 shadow-soft-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--duo-purple)]/15 border border-[var(--duo-purple)]/30 flex items-center justify-center text-[var(--duo-purple)] shadow-soft-xs">
              <Gamepad2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-foreground tracking-tight">Cài Đặt Bộ Từ Vựng Game</h1>
                {hasUnsavedChanges ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs font-bold animate-pulse">
                    Chưa lưu thay đổi
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs font-bold">
                    <Check className="w-3 h-3 mr-1" /> Đã đồng bộ Cloud
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Quản lý các chủ đề và từ vựng hiển thị trong <strong>Word Shooter</strong> và <strong>Word Defense</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className={cn(
                "font-extrabold shadow-[0_3px_0_var(--duo-green-dark)] transition-all",
                hasUnsavedChanges ? "bg-[var(--duo-green)] hover:bg-[var(--duo-green)]/90 text-white animate-bounce" : "bg-[var(--duo-green)] text-white"
              )}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Đang lưu Cloud...' : 'Lưu & Đồng Bộ Hệ Thống'}
            </Button>

            <Button
              onClick={handleOpenCreatePack}
              className="bg-[var(--duo-blue)] hover:bg-[var(--duo-blue)]/90 text-white font-extrabold shadow-[0_3px_0_var(--duo-blue-dark)]"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Thêm Bộ Từ
            </Button>

            <Button
              onClick={() => setIsToeicModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black shadow-[0_3px_0_#d97706]"
              title="Nạp bộ 600 từ vựng TOEIC Barron"
            >
              <Sparkles className="w-4 h-4 mr-1.5" /> 🎯 600 Từ TOEIC
            </Button>

            <Button
              variant="outline"
              onClick={handleExportJSON}
              className="border border-border/70 font-bold text-xs shadow-soft-xs"
              title="Xuất file JSON sao lưu"
            >
              <Download className="w-4 h-4 mr-1.5" /> Xuất JSON
            </Button>

            <label className="cursor-pointer">
              <Button
                variant="outline"
                asChild
                className="border border-border/70 font-bold text-xs shadow-soft-xs"
                title="Nạp file JSON sao lưu"
              >
                <span>
                  <Upload className="w-4 h-4 mr-1.5" /> Nhập JSON
                </span>
              </Button>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>

            <Button
              variant="ghost"
              onClick={() => setIsResetConfirmOpen(true)}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 font-bold text-xs"
              title="Khôi phục các bộ từ chuẩn ban đầu"
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Mặc định
            </Button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border/70 shadow-soft-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tổng số bộ từ vựng</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.totalPacks} bộ</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              📚
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border/70 shadow-soft-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tổng số từ vựng game</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.totalWords} từ</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              🎯
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border/70 shadow-soft-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Trung bình từ / bộ</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.avgWords} từ</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
              ⚡
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm bộ từ vựng theo tên, mô tả hoặc từ vựng bên trong..."
            className="pl-10 h-11 border border-border/70 rounded-xl bg-card font-medium shadow-soft-xs"
          />
        </div>

        {/* Packs Grid */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-[var(--duo-purple)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold text-muted-foreground">Đang tải danh sách bộ từ vựng...</p>
          </div>
        ) : filteredPacks.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border/80 p-8 shadow-soft-xs">
            <p className="text-4xl mb-2">🔍</p>
            <h3 className="text-lg font-bold text-foreground">Không tìm thấy bộ từ vựng nào</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Hãy thử tìm kiếm từ khóa khác hoặc tạo một bộ từ mới.</p>
            <Button onClick={handleOpenCreatePack} className="bg-[var(--duo-blue)] text-white font-bold rounded-xl active:scale-95 duration-120">
              <Plus className="w-4 h-4 mr-1.5" /> Tạo Bộ Từ Mới
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPacks.map((pack) => {
              const isSelected = activePackId === pack.id;

              return (
                <div
                  key={pack.id}
                  onClick={() => setActivePackId(pack.id)}
                  className={cn(
                    "group relative bg-card p-5 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-soft-md",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 shadow-soft-md"
                      : "border-border/70 hover:border-border shadow-soft-xs"
                  )}
                >
                  <div>
                    {/* Header: Icon + Name + Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-xl bg-muted/60 border border-border/70">
                          {pack.icon || '📚'}
                        </span>
                        <div>
                          <h3 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {pack.name}
                          </h3>
                          <Badge variant="secondary" className="mt-1 font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {pack.words?.length || 0} từ vựng
                          </Badge>
                        </div>
                      </div>

                      {pack.isCustom && (
                        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold">
                          Tùy biến
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                      {pack.description || 'Chưa có mô tả cho bộ từ này.'}
                    </p>

                    {/* Word Preview Pills */}
                    <div className="flex flex-wrap gap-1.5 mt-3.5">
                      {pack.words.slice(0, 4).map((w, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-muted text-xs font-mono font-bold text-foreground/80"
                        >
                          {w.word}
                        </span>
                      ))}
                      {pack.words.length > 4 && (
                        <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-bold text-muted-foreground">
                          +{pack.words.length - 4} từ nữa
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/70 gap-2">
                    <Button
                      size="sm"
                      onClick={() => setActivePackId(pack.id)}
                      className={cn(
                        "flex-1 font-extrabold text-xs h-9",
                        isSelected 
                          ? "bg-[var(--duo-blue)] text-white hover:bg-[var(--duo-blue)]/90" 
                          : "bg-muted hover:bg-slate-200 dark:hover:bg-slate-800 text-foreground"
                      )}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      {isSelected ? 'Đang mở từ vựng' : 'Quản lý từ vựng'}
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={(e) => handleOpenEditPack(pack, e)}
                      title="Sửa thông tin bộ từ"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={(e) => handleClonePack(pack, e)}
                      title="Nhân bản bộ từ"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPackToDelete(pack);
                      }}
                      title="Xóa bộ từ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Pack Word Manager Section (Drawer View) */}
        {activePack && (
          <div className="mt-8 bg-card rounded-2xl border border-[var(--duo-blue)]/50 p-6 shadow-soft-xl space-y-5 animate-in fade-in-50 duration-200">
            {/* Header of Active Pack */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{activePack.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-foreground">{activePack.name}</h2>
                    <Badge className="bg-[var(--duo-blue)] text-white font-bold text-xs">
                      {activePack.words.length} từ vựng
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{activePack.description}</p>
                </div>
              </div>

              {/* Actions for this pack */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleOpenAddWord}
                  className="bg-[var(--duo-green)] hover:bg-[var(--duo-green)]/90 text-white font-extrabold h-9 shadow-[0_2px_0_var(--duo-green-dark)]"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Thêm Từ Đơn
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsBulkImportOpen(true)}
                  className="bg-[var(--duo-blue)] hover:bg-[var(--duo-blue)]/90 text-white font-extrabold h-9 shadow-[0_2px_0_var(--duo-blue-dark)]"
                >
                  <FileText className="w-4 h-4 mr-1.5" /> Nhập Hàng Loạt
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenDbImport}
                  className="border border-border/70 font-bold text-xs h-9 shadow-soft-xs"
                >
                  <Database className="w-4 h-4 mr-1.5" /> Từ Ngân Hàng Hệ Thống
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActivePackId(null)}
                  className="h-9 font-bold text-xs"
                >
                  <X className="w-4 h-4 mr-1" /> Đóng
                </Button>
              </div>
            </div>

            {/* Word Search in Active Pack */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={wordSearchQuery}
                  onChange={(e) => setWordSearchQuery(e.target.value)}
                  placeholder={`Tìm trong ${activePack.words.length} từ của bộ "${activePack.name}"...`}
                  className="pl-9 h-9 border border-border/70 rounded-lg text-xs"
                />
              </div>

              <p className="text-xs font-bold text-muted-foreground">
                Hiển thị {filteredWords.length} / {activePack.words.length} từ
              </p>
            </div>

            {/* Words Table */}
            {filteredWords.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-xl p-6">
                <p className="text-3xl mb-1">📝</p>
                <p className="text-sm font-bold text-foreground">Chưa có từ vựng nào phù hợp</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Hãy bấm "Thêm Từ Đơn" hoặc "Nhập Hàng Loạt" để bổ sung từ vựng.</p>
                <Button size="sm" onClick={handleOpenAddWord} className="bg-[var(--duo-green)] text-white font-bold">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Thêm từ đầu tiên
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/70 shadow-soft-xs">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/80 text-muted-foreground text-xs uppercase tracking-wider font-extrabold border-b border-border/70">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3">Từ vựng (English)</th>
                      <th className="p-3">Phiên âm (IPA)</th>
                      <th className="p-3">Nghĩa tiếng Việt</th>
                      <th className="p-3 w-20 text-center">Phát âm</th>
                      <th className="p-3 w-28 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredWords.map((w, idx) => (
                      <tr key={w.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3 text-center text-xs text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono font-black text-foreground text-sm tracking-wide">
                          {w.word}
                        </td>
                        <td className="p-3 text-cyan-600 dark:text-cyan-400 font-mono text-xs">
                          {w.phonetic || <span className="text-muted-foreground italic">Chưa có</span>}
                        </td>
                        <td className="p-3 font-medium text-foreground text-xs">
                          {w.definition_vi || <span className="text-muted-foreground italic">Chưa có</span>}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-[var(--duo-blue)]"
                            onClick={() => playWordTTS(w.word)}
                            title="Nghe phát âm chuẩn TTS"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleOpenEditWord(w)}
                              title="Sửa từ này"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              onClick={() => handleDeleteWord(w.id)}
                              title="Xóa từ này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Create / Edit Pack Info */}
        <Dialog open={isPackModalOpen} onOpenChange={setIsPackModalOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="font-black text-xl">
                {editingPack ? 'Chỉnh Sửa Bộ Từ Vựng' : 'Tạo Bộ Từ Vựng Mới'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cài đặt tên gọi, biểu tượng và mô tả giới thiệu của bộ từ vựng game.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Icon Emoji</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={packIcon}
                    onChange={(e) => setPackIcon(e.target.value)}
                    placeholder="vd: 🚀, 🦁, 📈"
                    className="w-24 text-center text-xl h-11"
                    maxLength={4}
                  />
                  <div className="flex gap-1.5 overflow-x-auto p-1 bg-muted rounded-lg flex-1">
                    {['🗣️', '🦁', '💻', '📈', '🎓', '✈️', '🍔', '🏥', '⚽', '🎨', '🚀', '⭐'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setPackIcon(emoji)}
                        className="text-lg p-1 hover:bg-card rounded transition-transform hover:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Tên bộ từ vựng *</label>
                <Input
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  placeholder="vd: TOEIC Part 1 - Vật dụng gia đình"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Mô tả ngắn</label>
                <Textarea
                  value={packDescription}
                  onChange={(e) => setPackDescription(e.target.value)}
                  placeholder="Mô tả nội dung, mục tiêu rèn luyện và nhóm từ vựng..."
                  className="h-20 text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPackModalOpen(false)}>
                Hủy bỏ
              </Button>
              <Button onClick={handleSubmitPackModal} className="bg-[var(--duo-blue)] text-white font-bold">
                {editingPack ? 'Lưu Thay Đổi' : 'Tạo Bộ Từ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Add / Edit Single Word */}
        <Dialog open={isWordModalOpen} onOpenChange={setIsWordModalOpen}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="font-black text-lg">
                {editingWord ? 'Chỉnh Sửa Từ Vựng' : 'Thêm Từ Vựng Mới'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Nhập từ vựng tiếng Anh, phiên âm quốc tế và nghĩa tiếng Việt tương ứng.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Từ vựng tiếng Anh *</label>
                <div className="flex gap-2">
                  <Input
                    value={wordText}
                    onChange={(e) => setWordText(e.target.value)}
                    placeholder="vd: contract"
                    className="font-mono font-bold"
                  />
                  {wordText.trim() && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => playWordTTS(wordText.trim())}
                      title="Nghe thử"
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Phiên âm IPA (Tùy chọn)</label>
                <Input
                  value={wordPhonetic}
                  onChange={(e) => setWordPhonetic(e.target.value)}
                  placeholder="vd: /ˈkɒn.trækt/"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Nghĩa tiếng Việt *</label>
                <Input
                  value={wordDefinition}
                  onChange={(e) => setWordDefinition(e.target.value)}
                  placeholder="vd: hợp đồng ký kết"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWordModalOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSubmitWord} className="bg-[var(--duo-green)] text-white font-bold">
                {editingWord ? 'Cập Nhật' : 'Thêm Vào Bộ'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Bulk Import Words */}
        <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
          <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-black text-xl flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--duo-blue)]" />
                Nhập Từ Vựng Hàng Loạt
              </DialogTitle>
              <DialogDescription className="text-xs">
                Dán danh sách từ theo cú pháp linh hoạt hoặc tải file CSV/TXT. Hệ thống tự động phân tách từ vựng, nghĩa và phiên âm.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1 flex-1 overflow-y-auto">
              <div className="bg-muted/60 p-3 rounded-xl border text-xs space-y-1 text-muted-foreground">
                <p className="font-bold text-foreground">Hỗ trợ các định dạng dòng:</p>
                <p>• <code>contract - hợp đồng - /ˈkɒn.trækt/</code></p>
                <p>• <code>schedule | lịch trình | /ˈʃedʒ.uːl/</code></p>
                <p>• <code>colleague : đồng nghiệp</code> (không cần phiên âm)</p>
                <p>• Copy từ bảng Excel / Google Sheets dán trực tiếp vào đây!</p>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Nội dung danh sách từ vựng</label>
                <label className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-7 text-xs font-bold"
                  >
                    <span>
                      <Upload className="w-3.5 h-3.5 mr-1" /> Nạp file CSV / TXT
                    </span>
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <Textarea
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                placeholder={`contract - hợp đồng\nschedule - lịch trình\nmeeting - cuộc họp\ndiscount - chiết khấu`}
                className="h-44 font-mono text-xs leading-relaxed resize-none"
              />

              {/* Preview detected words count */}
              {bulkInputText.trim() && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 p-2.5 rounded-lg text-xs font-bold flex items-center justify-between">
                  <span>Nhận diện được: {parseBulkWordsText(bulkInputText).length} từ vựng hợp lệ</span>
                  <Badge variant="outline" className="bg-emerald-500/20 border-emerald-500/40 text-xs">
                    Sẵn sàng nạp
                  </Badge>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button variant="outline" onClick={() => setIsBulkImportOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleBulkImportSubmit}
                disabled={!bulkInputText.trim()}
                className="bg-[var(--duo-blue)] text-white font-bold"
              >
                Xác Nhận Nạp Vào Bộ Từ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Import from Database */}
        <Dialog open={isDbImportOpen} onOpenChange={setIsDbImportOpen}>
          <DialogContent className="sm:max-w-[620px] max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-black text-xl flex items-center gap-2">
                <Database className="w-5 h-5 text-[var(--duo-purple)]" />
                Nạp Từ Thư Viện Hệ Thống
              </DialogTitle>
              <DialogDescription className="text-xs">
                Chọn các từ vựng đã có trong ngân hàng câu hỏi học viện (bảng vocab_questions) để đưa vào bộ từ game.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1 flex-1 overflow-y-auto">
              <div className="flex gap-2">
                <Input
                  value={dbSearch}
                  onChange={(e) => setDbSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchDbWords()}
                  placeholder="Tìm từ vựng trong cơ sở dữ liệu..."
                  className="text-xs h-9"
                />
                <Button size="sm" onClick={fetchDbWords} className="bg-muted text-foreground h-9 font-bold">
                  Tìm
                </Button>
              </div>

              {isLoadingDb ? (
                <div className="py-12 text-center text-xs text-muted-foreground">Đang tìm từ vựng...</div>
              ) : dbWords.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">Không tìm thấy từ vựng nào trong ngân hàng câu hỏi.</div>
              ) : (
                <div className="max-h-72 overflow-y-auto border rounded-xl divide-y">
                  {dbWords.map((w) => {
                    const isSelected = selectedDbWordIds.has(w.id);
                    return (
                      <div
                        key={w.id}
                        onClick={() => handleToggleSelectDbWord(w.id)}
                        className={cn(
                          "p-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs",
                          isSelected ? "bg-[var(--duo-blue)]/10" : "hover:bg-muted/40"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                          <div>
                            <span className="font-mono font-black text-foreground">{w.word}</span>
                            {w.phonetic && <span className="ml-2 text-xs text-cyan-600 font-mono">{w.phonetic}</span>}
                            <p className="text-xs text-muted-foreground">{w.definition_vi}</p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            playWordTTS(w.word);
                          }}
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">
                Đã chọn: {selectedDbWordIds.size} từ
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDbImportOpen(false)}>
                  Hủy
                </Button>
                <Button
                  onClick={handleConfirmDbImport}
                  disabled={selectedDbWordIds.size === 0}
                  className="bg-[var(--duo-purple)] text-white font-bold"
                >
                  Nạp Vào Bộ Từ
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Alert Dialog: Delete Pack Confirm */}
        <AlertDialog open={!!packToDelete} onOpenChange={() => setPackToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black text-rose-500 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Xác nhận xóa bộ từ vựng?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Bạn có chắc chắn muốn xóa bộ từ <strong>"{packToDelete?.name}"</strong> ({packToDelete?.words.length} từ vựng)?
                Hành động này sẽ loại bỏ bộ từ này khỏi màn hình chọn game của học viên.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeletePack} className="bg-rose-500 hover:bg-rose-600 text-white font-bold">
                Xác Nhận Xóa
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Alert Dialog: Reset to Default Confirm */}
        <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black text-amber-500 flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Khôi phục các bộ từ chuẩn ban đầu?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Toàn bộ danh sách bộ từ hiện tại sẽ được đặt lại theo các bộ từ chuẩn (Giao tiếp, Động vật, Công nghệ, TOEIC, IELTS, Du lịch).
                Mọi thay đổi tùy biến chưa sao lưu sẽ bị ghi đè.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={handleResetToDefault} className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
                Khôi Phục Mặc Định
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog: TOEIC 600 Essential Words Import */}
        <Dialog open={isToeicModalOpen} onOpenChange={setIsToeicModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2 text-amber-500">
                <Sparkles className="w-6 h-6" />
                Nạp Bộ 600 Từ Vựng TOEIC Căn Bản (Barron's 600 Essential Words)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Trọn bộ 600 từ vựng cốt lõi chuẩn 50 chủ đề Barron: Hợp đồng, Tiếp thị, Tài chính, Nhân sự, Mua bán, Du lịch, v.v. Tất cả từ đều có đầy đủ phiên âm IPA quốc tế và nghĩa tiếng Việt chuẩn xác.
              </DialogDescription>
            </DialogHeader>

            {/* Quick Action Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2">
              <div
                onClick={handleImportToeicMaster}
                className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:border-amber-500 cursor-pointer transition-all flex flex-col justify-between group active:scale-[0.98] duration-120 shadow-soft-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xl">🎯</span>
                    <Badge className="bg-amber-500 text-white font-black text-xs">ĐỀ XUẤT</Badge>
                  </div>
                  <h4 className="text-sm font-black text-foreground group-hover:text-amber-500 transition-colors">
                    Nạp Gói Toàn Tập
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nạp 1 bộ duy nhất chứa đủ <strong>600 từ vựng</strong> để học viên luyện tập liên tục.
                  </p>
                </div>
                <Button size="sm" className="mt-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold w-full text-xs rounded-xl active:scale-95 duration-120">
                  Nạp Gói 600 Từ
                </Button>
              </div>

              <div
                onClick={handleImportToeicThematic}
                className="p-4 rounded-2xl border border-[var(--duo-blue)]/40 bg-[var(--duo-blue)]/10 hover:border-[var(--duo-blue)] cursor-pointer transition-all flex flex-col justify-between group active:scale-[0.98] duration-120 shadow-soft-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xl">📚</span>
                    <Badge className="bg-[var(--duo-blue)] text-white font-black text-xs">9 CHUYÊN ĐỀ</Badge>
                  </div>
                  <h4 className="text-sm font-black text-foreground group-hover:text-[var(--duo-blue)] transition-colors">
                    Nạp 9 Chuyên Đề
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Chia thành 9 gói theo lĩnh vực (Kinh doanh, Nhân sự, Tài chính...) từ 60-120 từ/bộ.
                  </p>
                </div>
                <Button size="sm" className="mt-3 bg-[var(--duo-blue)] hover:bg-[var(--duo-blue)]/90 text-white font-extrabold w-full text-xs rounded-xl active:scale-95 duration-120">
                  Nạp 9 Chuyên Đề
                </Button>
              </div>

              <div
                onClick={handleDownloadToeicJson}
                className="p-4 rounded-2xl border border-border/80 bg-card hover:border-[var(--duo-purple)] cursor-pointer transition-all flex flex-col justify-between group active:scale-[0.98] duration-120 shadow-soft-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xl">💾</span>
                    <Badge variant="outline" className="text-xs font-bold">JSON BACKUP</Badge>
                  </div>
                  <h4 className="text-sm font-black text-foreground group-hover:text-[var(--duo-purple)] transition-colors">
                    Tải File Sao Lưu
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tải file <code>.json</code> chứa toàn bộ 600 từ về máy tính để lưu trữ hoặc chia sẻ.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="mt-3 font-extrabold w-full text-xs rounded-xl active:scale-95 duration-120 border border-border/70">
                  <Download className="w-3.5 h-3.5 mr-1" /> Tải JSON (177KB)
                </Button>
              </div>
            </div>

            {/* Word Preview Section */}
            <div className="flex-1 flex flex-col min-h-0 border rounded-xl overflow-hidden mt-2 bg-muted/20">
              <div className="p-2.5 border-b bg-muted/40 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-muted-foreground">
                  Xem trước 600 từ vựng (Hiển thị {TOEIC_600_ALL_WORDS.filter((w) => !toeicPreviewSearch || w.word.includes(toeicPreviewSearch.toLowerCase()) || w.definition_vi.toLowerCase().includes(toeicPreviewSearch.toLowerCase())).length}/600 từ):
                </span>
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Tìm từ xem trước..."
                    value={toeicPreviewSearch}
                    onChange={(e) => setToeicPreviewSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-56 divide-y divide-border">
                {TOEIC_600_ALL_WORDS.filter(
                  (w) =>
                    !toeicPreviewSearch ||
                    w.word.toLowerCase().includes(toeicPreviewSearch.toLowerCase()) ||
                    w.definition_vi.toLowerCase().includes(toeicPreviewSearch.toLowerCase())
                )
                  .slice(0, 100)
                  .map((w, index) => (
                    <div key={w.id} className="p-2.5 px-4 flex items-center justify-between hover:bg-muted/40 text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-muted-foreground w-6 text-xs">{index + 1}.</span>
                        <span className="font-bold text-foreground">{w.word}</span>
                        {w.phonetic && <span className="font-mono text-muted-foreground text-xs">{w.phonetic}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground line-clamp-1 max-w-xs">{w.definition_vi}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-amber-500"
                          onClick={() => playWordTTS(w.word)}
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <DialogFooter className="mt-3 flex items-center justify-between sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Tổng cộng: <strong>600 từ vựng</strong> • 50 bài học Barron TOEIC
              </span>
              <Button variant="outline" onClick={() => setIsToeicModalOpen(false)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
