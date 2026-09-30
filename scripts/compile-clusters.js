import fs from 'fs';

const generated = JSON.parse(fs.readFileSync('scripts/generated_clusters.json', 'utf8'));

// High quality dictation clusters
const dictationCluster1 = {
  id: 'dictation-part2-unit1',
  title: 'Điền Từ Part 2 - Cụm 01: Nơi chốn & Người phụ trách',
  description: 'Trích từ Bài luyện nghe điền từ Part 2 (Module 12 - Phần 1). Bóc tách câu hỏi Where & Who.',
  testSource: 'Bài Luyện Nghe Điền Từ (Phần 1)',
  difficulty: 'Cơ bản (500+)',
  badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  sourceType: 'dictation',
  quizId: 31,
  questions: [
    {
      id: 2904,
      questionNumber: 1,
      audioUrl: 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=Where%20was%20the%20company%20picnic%3F%20(A)%20In%20April.%20(B)%20Refreshments%20will%20be%20provided.%20(C)%20At%20a%20park%20next%20to%20a%20lake.',
      questionText: 'Where was the company picnic?',
      questionTranslation: 'Chuyến dã ngoại của công ty đã được tổ chức ở đâu?',
      questionStem: {
        text: 'Where was',
        type: 'wh-question',
        label: 'Câu hỏi Nơi chốn (Where)',
        tip: 'Bắt buộc tìm địa điểm, công viên, phòng họp. Không bao giờ chọn Yes/No!'
      },
      keywordsAndCollocations: [
        { term: 'company picnic', phonetic: '/ˈkʌm.pə.ni ˈpɪk.nɪk/', meaningVi: 'chuyến dã ngoại công ty' },
        { term: 'next to a lake', phonetic: '/nɛkst tuː ə leɪk/', meaningVi: 'bên cạnh hồ nước' }
      ],
      reflexDirection1: {
        targetMeaningVi: 'Chuyến dã ngoại công ty đã tổ chức ở đâu?',
        questionIntent: 'Tìm địa điểm công viên / nơi chốn',
        quickTip: 'Nghe Where ➔ Bật ngay Ở ĐÂU!'
      },
      reflexDirection2: {
        predictedDirectDirections: ['At a park next to a lake.', 'In Central Park.'],
        commonIndirectResponses: [
          { vietnamesePrompt: 'Hỏi ban tổ chức xem', englishResponse: 'Ask the planning committee.', explanation: 'Chỉ người phụ trách', category: 'hoi_nguoi_khac' }
        ]
      },
      correctChoice: {
        letter: 'C',
        text: 'At a park next to a lake.',
        translation: 'Tại một công viên nằm cạnh cái hồ nước.',
        connectedSpeechNotes: [
          { segment: 'Where was the', phoneticSpelling: '/wɛərəzðə/', type: 'linking', explanation: 'Nối âm lướt' }
        ]
      },
      distractors: [
        { letter: 'A', text: 'In April.', translation: 'Vào tháng 4.', trapType: 'wrong_tense', trapNameVi: 'Bẫy thời gian (When)', analysisVi: 'Hỏi Where nhưng trả lời tháng 4 (When).' },
        { letter: 'B', text: 'Refreshments will be provided.', translation: 'Đồ ăn nhẹ sẽ được chuẩn bị.', trapType: 'association', trapNameVi: 'Bẫy liên tưởng đồ ăn picnic', analysisVi: 'Liên tưởng dã ngoại với đồ ăn nhẹ.' }
      ]
    },
    {
      id: 2905,
      questionNumber: 2,
      audioUrl: 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=Who%20is%20working%20at%20the%20front%20desk%20today%3F%20(A)%20That%20is%20a%20difficult%20request.%20(B)%20It%20is%20Katie%20Miller.%20(C)%20Make%20room%20on%20your%20desk.',
      questionText: "Who is working at the front desk today?",
      questionTranslation: 'Ai sẽ làm việc tại quầy lễ tân vào hôm nay vậy?',
      questionStem: {
        text: 'Who is working',
        type: 'wh-question',
        label: 'Câu hỏi Người (Who)',
        tip: 'Cần tìm tên người hoặc chức vụ. Tuyệt đối không chọn Yes/No!'
      },
      keywordsAndCollocations: [
        { term: 'front desk', phonetic: '/frʌnt dɛsk/', meaningVi: 'quầy lễ tân / quầy tiếp tân' }
      ],
      reflexDirection1: {
        targetMeaningVi: 'Ai làm ở quầy lễ tân hôm nay?',
        questionIntent: 'Tìm tên người trực quầy lễ tân',
        quickTip: 'Nghe Who ➔ Tìm tên người!'
      },
      reflexDirection2: {
        predictedDirectDirections: ["It's Katie Miller.", 'Sarah from reception.'],
        commonIndirectResponses: [
          { vietnamesePrompt: 'Hôm nay quầy đóng cửa', englishResponse: 'The front desk is closed today.', explanation: 'Tình huống thực tế', category: 'tinh_huong_thuc_te' }
        ]
      },
      correctChoice: {
        letter: 'B',
        text: "It's Katie Miller.",
        translation: 'Đó là Katie Miller.',
        connectedSpeechNotes: [
          { segment: "It's Katie", phoneticSpelling: '/ɪts ˈkeɪti/', type: 'linking', explanation: 'Nối âm' }
        ]
      },
      distractors: [
        { letter: 'A', text: "That's a difficult request.", translation: 'Đó là một yêu cầu khó.', trapType: 'irrelevant', trapNameVi: 'Bẫy lạc đề', analysisVi: 'Không trả lời câu hỏi Who.' },
        { letter: 'C', text: 'Make room on your desk.', translation: 'Dọn chỗ trên bàn làm việc của bạn đi.', trapType: 'same_sound', trapNameVi: 'Bẫy lặp từ (Desk)', analysisVi: 'Lặp lại từ desk trong front desk.' }
      ]
    }
  ]
};

const allClusters = [dictationCluster1, ...generated];

const tsContent = `import { Part2Cluster, Part2StepMeta } from "@/types/part2Coach";

export const PART2_STEPS_META: Part2StepMeta[] = [
  {
    id: 1,
    name: "Nghe thử cụm câu hỏi",
    shortName: "Nghe thử",
    subtitle: "Làm quen ngữ cảnh & Đo tai nghe",
    description: "Nghe 1 lượt câu hỏi cùng 3 đáp án (A, B, C) ở tốc độ thực tế để tự đánh giá tai mình bắt được bao nhiêu % nội dung.",
    iconName: "Headphones",
    badge: "Bước 1",
  },
  {
    id: 2,
    name: "Cụm từ chức năng (Chunks)",
    shortName: "Từ khóa & Chunks",
    subtitle: "Bẻ nhỏ từ để hỏi & Collocations",
    description: "Bóc tách 2 nhóm từ quan trọng nhất: Từ để hỏi / Trợ động từ và Từ vựng chủ đề. Lặp lại to 3 lần kèm nghĩa tiếng Việt.",
    iconName: "Layers",
    badge: "Bước 2",
  },
  {
    id: 3,
    name: "Phản xạ Chiều 1: Nghe hiểu tức thì",
    shortName: "Phản xạ Hỏi (1s)",
    subtitle: "1 Giây bật nghĩa & Dạng câu hỏi",
    description: "Nghe câu hỏi tiếng Anh → đếm ngược 1 giây → lập tức bật to nghĩa tiếng Việt hoặc xác định mục tiêu câu hỏi cần tìm.",
    iconName: "Zap",
    badge: "Bước 3",
  },
  {
    id: 4,
    name: "Phản xạ Chiều 2: Bật câu trả lời",
    shortName: "Phản xạ Đáp",
    subtitle: "Đoán hướng & Phản xạ gián tiếp",
    description: "Tập đoán trước hướng trả lời và luyện phản xạ với các câu trả lời gián tiếp phổ biến (Tôi không biết, Hỏi David xem, Lịch bị dời...).",
    iconName: "MessageSquareShare",
    badge: "Bước 4",
  },
  {
    id: 5,
    name: "Shadowing Cặp Đúng (3-5 lần)",
    shortName: "Shadowing Cặp Đúng",
    subtitle: "Nối âm, nuốt âm & Nhại ngữ điệu",
    description: "Vòng 1: Nghe và nhìn tapescript có đánh dấu nối âm/nuốt âm. Vòng 2 & 3: Ẩn script, nghe và nhại lại (Shadowing) theo ngữ điệu bản xứ.",
    iconName: "Mic",
    badge: "Bước 5",
  },
  {
    id: 6,
    name: "Bóc mẽ bẫy phương án sai",
    shortName: "Nhận diện bẫy",
    subtitle: "Bẫy đồng âm, sai thì, Yes/No",
    description: "Phân tích nhanh lý do sai của 2 đáp án còn lại: Bẫy lặp từ/từ đồng âm, bẫy sai thì, bẫy Yes/No cho câu hỏi Wh-...",
    iconName: "ShieldAlert",
    badge: "Bước 6",
  },
  {
    id: 7,
    name: "Nghe liên tục toàn bài (Loop)",
    shortName: "Nghe thụ động",
    subtitle: "Tạo phản xạ thụ động vô thức",
    description: "Trình phát audio tự động phát lặp lại toàn bộ cụm câu hỏi + đáp án đúng liên tục, tùy chỉnh tốc độ để ngấm ngữ điệu.",
    iconName: "Repeat",
    badge: "Bước 7",
  },
];

export const PART2_CLUSTERS: Part2Cluster[] = ${JSON.stringify(allClusters, null, 2)};
`;

fs.writeFileSync('src/data/part2CoachData.ts', tsContent, 'utf8');
console.log('Đã cập nhật thành công src/data/part2CoachData.ts với', allClusters.length, 'cụm câu hỏi!');
