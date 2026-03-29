import StudentLayout from "@/components/StudentLayout";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle, FileText, CheckCircle, Lock, ChevronLeft, ChevronRight, Star, Check } from "lucide-react";
import { useState } from "react";

const lessons = [
  { id: 1, title: "Introduction to TOEIC Part 1 and Photos of People", status: "done", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", materials: 3 },
  { id: 2, title: "Photos of People and Objects and Views", status: "done", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
  { id: 3, title: "Practice 1", status: "current", videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
  { id: 4, title: "Practice 2", status: "locked", videoUrl: "" },
  { id: 5, title: "Practice 3", status: "locked", videoUrl: "" },
];

const parts = [
  { title: "PART 1: Mô Tả Tranh", lessons: lessons },
  { title: "PART 2: Hỏi Đáp", lessons: [] },
  { title: "PART 3: Hội Thoại Ngắn", lessons: [] },
  { title: "PART 4: Bài Nói Ngắn", lessons: [] },
  { title: "PART 5-6: Hoàn Thành Câu", lessons: [] },
  { title: "PART 7: Đọc Hiểu", lessons: [] },
  { title: "Luyện Tập Tổng Hợp", lessons: [] },
];

const LearnPage = () => {
  const { courseId } = useParams();
  const [currentLesson, setCurrentLesson] = useState(lessons[2]);
  const [completed, setCompleted] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState<{ text: string; time: string }[]>([]);

  const currentIndex = lessons.findIndex(l => l.id === currentLesson.id);

  const saveNote = () => {
    if (!notes.trim()) return;
    setSavedNotes(prev => [...prev, { text: notes, time: new Date().toLocaleTimeString("vi-VN") }]);
    setNotes("");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col lg:flex-row">
        {/* Video area */}
        <div className="flex-1 min-w-0">
          {/* Video player */}
          <div className="aspect-video bg-foreground">
            <iframe
              src={currentLesson.videoUrl || "about:blank"}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={currentLesson.title}
            />
          </div>

          {/* Controls */}
          <div className="p-4 border-b">
            <h1 className="text-lg font-bold text-foreground mb-3">{currentLesson.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentIndex === 0}
                onClick={() => setCurrentLesson(lessons[currentIndex - 1])}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Bài trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentIndex === lessons.length - 1}
                onClick={() => setCurrentLesson(lessons[currentIndex + 1])}
              >
                Bài tiếp <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="sm"
                variant={completed ? "default" : "outline"}
                onClick={() => setCompleted(!completed)}
              >
                <Check className="w-4 h-4 mr-1" />
                {completed ? "Đã hoàn thành" : "Đánh dấu hoàn thành"}
              </Button>
              <Button
                size="sm"
                variant={favorited ? "default" : "outline"}
                onClick={() => setFavorited(!favorited)}
              >
                <Star className={`w-4 h-4 mr-1 ${favorited ? "fill-current" : ""}`} />
                Yêu thích
              </Button>
            </div>
          </div>

          {/* Tabs below video */}
          <div className="p-4">
            <Tabs defaultValue="materials">
              <TabsList>
                <TabsTrigger value="materials">Tài liệu</TabsTrigger>
                <TabsTrigger value="notes">Ghi chú</TabsTrigger>
                <TabsTrigger value="discussion">Thảo luận</TabsTrigger>
              </TabsList>
              <TabsContent value="materials" className="mt-4">
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-lg border">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-sm flex-1">Tài liệu Part 1 - File {i}.pdf</span>
                      <Button size="sm" variant="outline">Tải xuống</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="notes" className="mt-4 space-y-4">
                <div className="flex gap-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Nhập ghi chú của bạn..."
                    className="flex-1 min-h-[80px] rounded-lg border bg-card p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button onClick={saveNote}>Lưu</Button>
                </div>
                {savedNotes.map((n, i) => (
                  <div key={i} className="p-3 bg-card rounded-lg border">
                    <p className="text-sm text-foreground">{n.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="discussion" className="mt-4">
                <p className="text-sm text-muted-foreground">Tính năng thảo luận sẽ được cập nhật sớm.</p>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Course sidebar */}
        <div className="w-full lg:w-80 border-l bg-card overflow-y-auto max-h-screen">
          <div className="p-4 border-b">
            <p className="text-sm font-semibold text-foreground">📋 Nội dung khóa học</p>
            <p className="text-xs text-muted-foreground mt-1">32/70 bài hoàn thành (45%)</p>
            <div className="w-full h-1.5 bg-muted rounded-full mt-2">
              <div className="h-full bg-primary rounded-full" style={{ width: "45%" }} />
            </div>
          </div>
          <Accordion type="multiple" defaultValue={["part-0"]} className="px-2 py-1">
            {parts.map((part, pi) => (
              <AccordionItem key={pi} value={`part-${pi}`} className="border-none">
                <AccordionTrigger className="py-2 px-2 text-xs font-semibold hover:no-underline">
                  {part.title}
                </AccordionTrigger>
                <AccordionContent className="pb-1">
                  {part.lessons.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-1">Đang cập nhật...</p>
                  ) : (
                    part.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => lesson.status !== "locked" && setCurrentLesson(lesson)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors text-left ${
                          currentLesson.id === lesson.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                        } ${lesson.status === "locked" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {lesson.status === "done" ? <CheckCircle className="w-3 h-3 text-success shrink-0" /> :
                          lesson.status === "locked" ? <Lock className="w-3 h-3 shrink-0" /> :
                            <PlayCircle className="w-3 h-3 shrink-0" />}
                        <span className="truncate">{lesson.title}</span>
                      </button>
                    ))
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default LearnPage;
