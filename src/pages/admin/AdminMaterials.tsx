import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Upload, Copy, Edit, Trash2, FileText, Image, Music } from "lucide-react";

const materials = [
  { id: 1, name: "Part 1 - Photos of People.pdf", type: "pdf", size: "2.4 MB", date: "25/03/2026", linkedTo: "TOEIC L&R > Part 1 > Đề 01" },
  { id: 2, name: "Part 2 - Listening Exercise.mp3", type: "audio", size: "5.1 MB", date: "24/03/2026", linkedTo: "TOEIC L&R > Part 2" },
  { id: 3, name: "Vocab Day 1 - Cover.jpg", type: "image", size: "850 KB", date: "23/03/2026", linkedTo: "EZ Vocab > Day 1" },
  { id: 4, name: "Full Test 2026 Đề 01 Transcript.pdf", type: "pdf", size: "1.8 MB", date: "22/03/2026", linkedTo: "Full Test > Đề 01" },
  { id: 5, name: "Part 3 - Conversation Audio.mp3", type: "audio", size: "8.2 MB", date: "21/03/2026", linkedTo: "TOEIC L&R > Part 3" },
  { id: 6, name: "Part 7 - Reading Passage.pdf", type: "pdf", size: "3.5 MB", date: "20/03/2026", linkedTo: "TOEIC L&R > Part 7" },
];

const typeIcon = { pdf: FileText, image: Image, audio: Music };

const AdminMaterials = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quản lý Tài Liệu</h1>
            <p className="text-sm text-muted-foreground">{materials.length} tài liệu</p>
          </div>
        </div>

        {/* Upload area */}
        <div className="bg-card rounded-xl border-2 border-dashed p-8 text-center space-y-3">
          <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Kéo thả file vào đây hoặc click để chọn</p>
          <p className="text-xs text-muted-foreground">PDF, JPG, PNG, MP3, MP4 · Tối đa 20MB/file</p>
          <Button variant="outline">Chọn file</Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm tài liệu..." className="pl-9" />
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m) => {
            const Icon = typeIcon[m.type as keyof typeof typeIcon] || FileText;
            return (
              <div key={m.id} className="bg-card rounded-xl border p-4 space-y-3 card-hover group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.size} · {m.type.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{m.date}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">📎 {m.linkedTo}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost"><Copy className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost"><Edit className="w-3 h-3" /></Button>
                  <Button size="icon" variant="ghost"><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMaterials;
