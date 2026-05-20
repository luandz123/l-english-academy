import React from "react";

interface Activity {
  id: number;
  avatar: string;
  name: string;
  action: string;
  target: string;
  result: string;
  time: string;
  color: string;
}

const mockActivities: Activity[] = [
  {
    id: 1,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces",
    name: "Nguyễn Thị Mai",
    action: "hoàn thành bài thi",
    target: "TOEIC ETS 2024 - Test 1",
    result: "🎉 925/990",
    time: "vừa xong",
    color: "bg-[var(--duo-correct)]",
  },
  {
    id: 2,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces",
    name: "Trần Văn Hùng",
    action: "luyện nghe chép",
    target: "Dictation Part 2 - Unit 5",
    result: "✍️ 29/30 câu",
    time: "2 phút trước",
    color: "bg-[var(--duo-blue)]",
  },
  {
    id: 3,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces",
    name: "Lê Minh Anh",
    action: "chinh phục từ vựng",
    target: "Flashcard TOEIC 600 từ",
    result: "🃏 45 từ mới",
    time: "5 phút trước",
    color: "bg-[var(--duo-purple)]",
  },
  {
    id: 4,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=faces",
    name: "Hoàng Đức Duy",
    action: "luyện nghe",
    target: "TOEIC Part 3 - Short Talks",
    result: "🎧 Đạt 90%",
    time: "7 phút trước",
    color: "bg-[var(--duo-yellow)]",
  },
  {
    id: 5,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=faces",
    name: "Bùi Phương Thảo",
    action: "hoàn thành bài viết",
    target: "TOEIC Writing Part 1",
    result: "📝 Đạt điểm tuyệt đối",
    time: "10 phút trước",
    color: "bg-[var(--duo-green)]",
  },
  {
    id: 6,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=faces",
    name: "Phạm Minh Tuấn",
    action: "nâng cấp tài khoản",
    target: "Combo VIP TOEIC Toàn diện",
    result: "🚀 Sẵn sàng 990",
    time: "12 phút trước",
    color: "bg-[var(--duo-orange)]",
  },
  {
    id: 7,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=faces",
    name: "Nguyễn Diệu Linh",
    action: "hoàn thành bài đọc",
    target: "TOEIC Part 5 - Incomplete Sentences",
    result: "⭐ 30/30 câu",
    time: "15 phút trước",
    color: "bg-[var(--duo-correct)]",
  },
  {
    id: 8,
    avatar: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=80&h=80&fit=crop&crop=faces",
    name: "Đỗ Hữu Nam",
    action: "hoàn thành bài thi",
    target: "TOEIC Full Test - Đề số 4",
    result: "🏆 990/990",
    time: "20 phút trước",
    color: "bg-[var(--duo-blue)]",
  },
];

const ActivityTicker = () => {
  // Double the list to ensure seamless infinite scroll
  const activitiesList = [...mockActivities, ...mockActivities];

  return (
    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-zinc-900 dark:to-zinc-800 border-y-2 border-[var(--duo-gray)] overflow-hidden py-3">
      {/* Ticker Header */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-custom {
          display: flex;
          width: max-content;
          animation: marquee 35s linear infinite;
        }
        .animate-marquee-custom:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-3">
        <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-zinc-800 border-2 border-[var(--duo-gray)] rounded-full px-4 py-1 shadow-[0_2px_0_var(--duo-gray)]">
          <span className="animate-pulse flex h-2.5 w-2.5 rounded-full bg-rose-500" />
          <span className="text-xs md:text-sm font-extrabold text-foreground tracking-wide uppercase">
            🔥 Nhật ký luyện thi
          </span>
        </div>

        {/* Ticker Content */}
        <div className="w-full overflow-hidden relative">
          {/* Gradient overlays to fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-emerald-50 to-transparent dark:from-zinc-900 z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-cyan-50 to-transparent dark:from-zinc-800 z-10 pointer-events-none" />

          <div className="animate-marquee-custom flex items-center gap-6">
            {activitiesList.map((act, index) => (
              <div
                key={`${act.id}-${index}`}
                className="flex items-center gap-2.5 bg-white dark:bg-zinc-950 border-2 border-[var(--duo-gray)] dark:border-zinc-800 rounded-full px-3 py-1.5 shadow-[0_2px_0_var(--duo-gray)] dark:shadow-none shrink-0 cursor-default hover:border-[var(--duo-correct)] transition-colors"
              >
                <div className="relative">
                  <img
                    src={act.avatar}
                    alt={act.name}
                    className="w-7 h-7 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${act.color}`} />
                </div>
                <div className="text-xs md:text-sm font-bold flex items-center gap-1.5">
                  <span className="text-foreground">{act.name}</span>
                  <span className="text-muted-foreground font-normal">{act.action}</span>
                  <span className="text-[var(--duo-blue-dark)] font-extrabold">{act.target}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/50">
                    {act.result}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">
                    ({act.time})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityTicker;
