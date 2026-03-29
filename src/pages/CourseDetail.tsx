import StudentLayout from "@/components/StudentLayout";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PlayCircle, FileText, CheckCircle, Lock } from "lucide-react";

const parts = [
  {
    title: "PART 1: Mô Tả Tranh (6 câu)",
    stats: "5 bài giảng · 14 bài thi",
    items: [
      { type: "video", title: "Introduction to TOEIC Part 1 and Photos of People", status: "done", materials: 3 },
      { type: "video", title: "Photos of People and Objects and Views", status: "done" },
      { type: "video", title: "Practice 1", status: "current" },
      { type: "video", title: "Practice 2", status: "locked" },
      { type: "video", title: "Practice 3", status: "locked" },
      { type: "quiz", title: "Thi Online: Photos of People (Đề 01)", status: "done", score: "10/10", questions: 10 },
      { type: "quiz", title: "Thi Online: Photos of People (Đề 02)", status: "done", score: "9/10", questions: 10 },
      { type: "quiz", title: "Luyện tập Part 1 theo xu hướng 2026 (Đề 01-13)", status: "available", questions: 12 },
    ],
  },
  { title: "PART 2: Hỏi Đáp (25 câu)", stats: "7 bài giảng · 18 bài thi", items: [] },
  { title: "PART 3: Hội Thoại Ngắn (39 câu)", stats: "4 bài giảng · 18 bài thi", items: [] },
  { title: "PART 4: Bài Nói Ngắn (30 câu)", stats: "5 bài giảng · 20 bài thi", items: [] },
  { title: "PART 5-6: Hoàn Thành Câu", stats: "15 bài giảng · 50+ bài thi", items: [] },
  { title: "PART 7: Đọc Hiểu & Từ Vựng", stats: "13+ bài giảng", items: [] },
  { title: "Luyện Tập Tổng Hợp & Chữa Đề", stats: "29 bài giảng", items: [] },
];

const CourseDetail = () => {
  const { courseId } = useParams();

  return (
    <StudentLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="bg-card rounded-xl border p-6 space-y-4">
          <Badge variant="secondary">🎬 Video + Bài Thi</Badge>
          <h1 className="text-2xl font-bold text-foreground">Luyện thi TOEIC Nghe-Đọc</h1>
          <p className="text-sm text-muted-foreground">Giảng viên: Cô Mai Phương · 70 bài giảng · 100+ bài thi · 740 tài liệu · 6 tháng</p>
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Tiến độ: 45%</span>
              <span>32/70 bài hoàn thành</span>
            </div>
            <Progress value={45} className="h-2" />
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <Link to={`/courses/${courseId}/learn`}>Tiếp tục học</Link>
            </Button>
            <Button variant="outline">Tổng quan khóa học</Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Nội dung</TabsTrigger>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="materials">Tài liệu</TabsTrigger>
          </TabsList>
          <TabsContent value="content" className="mt-4">
            <Accordion type="multiple" defaultValue={["part-0"]} className="space-y-2">
              {parts.map((part, pi) => (
                <AccordionItem key={pi} value={`part-${pi}`} className="bg-card rounded-lg border">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-semibold text-sm text-foreground">{part.title}</span>
                      <span className="text-xs text-muted-foreground">{part.stats}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3">
                    {part.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Nội dung đang được cập nhật...</p>
                    ) : (
                      <div className="space-y-1">
                        {part.items.map((item, ii) => (
                          <div key={ii} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                            {item.type === "video" ? (
                              <PlayCircle className="w-4 h-4 text-primary shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-accent shrink-0" />
                            )}
                            <span className="text-sm text-foreground flex-1">{item.title}</span>
                            {item.materials && (
                              <Badge variant="secondary" className="text-xs">{item.materials} tài liệu</Badge>
                            )}
                            {item.score && (
                              <Badge className="bg-accent text-accent-foreground text-xs">{item.score}</Badge>
                            )}
                            {item.status === "done" && <CheckCircle className="w-4 h-4 text-success shrink-0" />}
                            {item.status === "current" && <PlayCircle className="w-4 h-4 text-warning shrink-0" />}
                            {item.status === "locked" && <Lock className="w-4 h-4 text-muted-foreground shrink-0" />}
                            {item.status === "available" && item.questions && (
                              <Button size="sm" variant="outline" className="text-xs h-7">Làm bài</Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
          <TabsContent value="overview" className="mt-4">
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <h3 className="font-bold text-foreground">Giới thiệu khóa học</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Khóa luyện thi TOEIC Nghe-Đọc (Listening & Reading) toàn diện với 70+ bài giảng video chất lượng cao, 
                100+ bài thi online bám sát format 2026, và 740 tài liệu bổ trợ. Giảng viên: Cô Mai Phương — 
                chuyên gia TOEIC với 10+ năm kinh nghiệm.
              </p>
              <h3 className="font-bold text-foreground">Mục tiêu</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Đạt 700-850+ TOEIC Listening & Reading</li>
                <li>Nắm vững chiến lược làm bài Part 1-7</li>
                <li>Luyện đề theo format mới nhất 2026</li>
              </ul>
            </div>
          </TabsContent>
          <TabsContent value="materials" className="mt-4">
            <div className="bg-card rounded-xl border p-6">
              <p className="text-sm text-muted-foreground">740 tài liệu sẽ được hiển thị tại đây.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  );
};

export default CourseDetail;
