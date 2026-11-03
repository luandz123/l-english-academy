import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Film, ImageIcon, Link2, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { uploadMediaSafe } from "@/lib/api/media";
import type { HeroBackground, HeroBannerConfig } from "@/services/homepageShowcaseService";

interface Props {
  value: HeroBannerConfig;
  onChange: (next: HeroBannerConfig) => void;
}

const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;
const MAX_MB = 50;

const newId = () => `bg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/**
 * Quản lý nền banner trang chủ: thêm ảnh/GIF/video (tải lên hoặc dán link), bật/tắt, độ tối,
 * thứ tự, thời gian tự chuyển. Lưu cùng nút "Lưu" của tab Kệ trang chủ.
 */
export const HeroBannerManager = ({ value, onChange }: Props) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const items = value.backgrounds;
  const enabledCount = items.filter((b) => b.enabled).length;
  const setItems = (backgrounds: HeroBackground[]) => onChange({ ...value, backgrounds });
  const update = (id: string, patch: Partial<HeroBackground>) =>
    setItems(items.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  };
  const remove = (id: string) => {
    const next = items.filter((b) => b.id !== id);
    if (!next.some((b) => b.enabled)) {
      toast({ title: "Cần ít nhất một nền đang bật", variant: "destructive" });
      return;
    }
    setItems(next);
  };
  const add = (bg: Omit<HeroBackground, "id">) => setItems([...items, { ...bg, id: newId() }]);

  const handleFile = async (file: File) => {
    const isVideo = file.type.startsWith("video/");
    if (!isVideo && !file.type.startsWith("image/")) {
      toast({ title: "Chỉ nhận ảnh (JPG, PNG, WebP, GIF) hoặc video (MP4, WebM)", variant: "destructive" });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast({ title: `Tệp lớn hơn ${MAX_MB}MB`, description: "Hãy nén lại hoặc dùng link video.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
    const { data, error } = await uploadMediaSafe(file, "uploads", `hero-banner-${Date.now()}.${ext}`);
    setUploading(false);
    if (error || !data) {
      toast({ title: "Tải lên thất bại", description: error?.message, variant: "destructive" });
      return;
    }
    add({ type: isVideo ? "video" : "image", url: data.publicUrl, label: file.name, dim: 35, enabled: true });
    toast({ title: "Đã thêm nền mới", description: "Bấm Lưu để áp dụng lên trang chủ." });
  };

  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast({ title: "Link phải bắt đầu bằng http:// hoặc https://", variant: "destructive" });
      return;
    }
    add({ type: VIDEO_EXT.test(url) ? "video" : "image", url, label: url.split("/").pop()?.slice(0, 60), dim: 35, enabled: true });
    setUrlInput("");
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <p className="text-xs text-muted-foreground">
          Banner tự chuyển lần lượt qua các nền đang bật. Nội dung (tiêu đề, nút, hotline) luôn nằm trên nền. Nền ảnh/video nên rộng ≥ 1600px; GIF và WebP động đều chạy được.
        </p>
        <div className="space-y-1">
          <Label htmlFor="hero-interval" className="text-xs font-bold">Chuyển nền sau (giây)</Label>
          <Input
            id="hero-interval"
            type="number"
            min={3}
            max={60}
            value={value.interval_seconds}
            onChange={(e) => onChange({ ...value, interval_seconds: Math.min(60, Math.max(3, Number(e.target.value) || 8)) })}
            className="h-9 w-32"
          />
        </div>
      </div>

      <ul className="space-y-2.5">
        {items.map((bg, i) => (
          <li key={bg.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
            <div className="relative w-full sm:w-40 aspect-video shrink-0 rounded-lg overflow-hidden bg-[#0b1430] border border-border/60">
              {bg.type === "night_sky" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-[#060b1f] via-[#121a45] to-[#1d1f4f] text-indigo-200">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-[10px] font-bold">Nền động có sẵn</span>
                </div>
              ) : bg.type === "video" ? (
                <video src={bg.url} className="absolute inset-0 w-full h-full object-cover" muted loop autoPlay playsInline />
              ) : (
                <img src={bg.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black" style={{ opacity: bg.dim / 100 }} />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                {bg.type === "video" ? <Film className="w-4 h-4" /> : bg.type === "image" ? <ImageIcon className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <Input
                  value={bg.label ?? ""}
                  onChange={(e) => update(bg.id, { label: e.target.value })}
                  placeholder="Tên nền (chỉ để admin dễ nhận ra)"
                  aria-label="Tên nền"
                  className="h-8 text-xs"
                />
              </div>
              {bg.type !== "night_sky" && (
                <p className="text-[11px] text-muted-foreground truncate" title={bg.url}>{bg.url}</p>
              )}
              <div className="flex items-center gap-3">
                <Label htmlFor={`dim-${bg.id}`} className="text-[11px] text-muted-foreground shrink-0">Độ tối {bg.dim}%</Label>
                <input
                  id={`dim-${bg.id}`}
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={bg.dim}
                  onChange={(e) => update(bg.id, { dim: Number(e.target.value) })}
                  className="w-full max-w-xs accent-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-2 mr-2">
                <Switch
                  checked={bg.enabled}
                  onCheckedChange={(val) => {
                    if (!val && enabledCount <= 1) {
                      toast({ title: "Cần ít nhất một nền đang bật", variant: "destructive" });
                      return;
                    }
                    update(bg.id, { enabled: val });
                  }}
                  aria-label={bg.enabled ? "Tắt nền này" : "Bật nền này"}
                />
                <span className="text-[11px] text-muted-foreground w-8">{bg.enabled ? "Bật" : "Tắt"}</span>
              </div>
              <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Đưa lên">
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Đưa xuống">
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" className="h-9 w-9 text-rose-500 hover:text-rose-400" onClick={() => remove(bg.id)} aria-label="Xóa nền">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col lg:flex-row gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <Button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Đang tải lên..." : "Tải ảnh / GIF / video lên"}
        </Button>
        <div className="flex flex-1 gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddUrl())}
            placeholder="Hoặc dán link ảnh/video (https://...)"
            aria-label="Link ảnh hoặc video nền"
            className="h-10"
          />
          <Button type="button" variant="outline" onClick={handleAddUrl} className="gap-2 shrink-0">
            <Link2 className="w-4 h-4" /> Thêm link
          </Button>
        </div>
        {!items.some((b) => b.type === "night_sky") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => add({ type: "night_sky", label: "Bầu trời đêm (sao băng)", dim: 0, enabled: true })}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" /> Thêm lại nền sao băng
          </Button>
        )}
      </div>
    </div>
  );
};

export default HeroBannerManager;
