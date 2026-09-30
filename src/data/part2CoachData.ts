import { Part2Cluster, Part2StepMeta } from "@/types/part2Coach";

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
    name: "Bóc mẽ cạm bẫy",
    shortName: "Soi cạm bẫy",
    subtitle: "So sánh 2 bẫy và Đáp án đúng",
    description: "Đặt cạnh 2 phương án bẫy với đáp án đúng để bóc trần bẫy từ đồng âm, lặp từ, bẫy Yes/No và câu trả lời lạc đề.",
    iconName: "ShieldAlert",
    badge: "Bước 6",
  },
  {
    id: 7,
    name: "Nghe thực chiến như thi",
    shortName: "Thực chiến phòng thi",
    subtitle: "Áp lực 5s & Chấm điểm tức thì",
    description: "Mô phỏng 100% không gian thi TOEIC thật: Tự động chạy audio liên tục kèm đếm ngược 5s chuyển câu hoặc tự luyện từng câu, chọn A/B/C và đối chiếu sự tiến bộ so với Bước 1.",
    iconName: "FileCheck2",
    badge: "Bước 7",
  },
  {
    id: 8,
    name: "Nghe liên tục toàn bài (Loop)",
    shortName: "Nghe thụ động",
    subtitle: "Tạo phản xạ thụ động vô thức",
    description: "Trình phát audio tự động phát lặp lại toàn bộ cụm câu hỏi + đáp án đúng liên tục, tùy chỉnh tốc độ để ngấm ngữ điệu.",
    iconName: "Repeat",
    badge: "Bước 8",
  },
];

export const PART2_CLUSTERS: Part2Cluster[] = [
  {
    "id": "dictation-part2-unit1",
    "title": "Điền Từ Part 2 - Cụm 01: Nơi chốn & Người phụ trách",
    "description": "Trích từ Bài luyện nghe điền từ Part 2 (Module 12 - Phần 1). Bóc tách câu hỏi Where & Who.",
    "testSource": "Bài Luyện Nghe Điền Từ (Phần 1)",
    "difficulty": "Cơ bản (500+)",
    "badgeColor": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "sourceType": "dictation",
    "quizId": 31,
    "questions": [
      {
        "id": 2904,
        "questionNumber": 1,
        "audioUrl": "/api/tts?q=Where%20was%20the%20company%20picnic%3F",
        "questionText": "Where was the company picnic?",
        "questionTranslation": "Chuyến dã ngoại của công ty đã được tổ chức ở đâu?",
        "questionStem": {
          "text": "Where was",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Bắt buộc tìm địa điểm, công viên, phòng họp. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "company picnic",
            "phonetic": "/ˈkʌm.pə.ni ˈpɪk.nɪk/",
            "meaningVi": "chuyến dã ngoại công ty"
          },
          {
            "term": "next to a lake",
            "phonetic": "/nɛkst tuː ə leɪk/",
            "meaningVi": "bên cạnh hồ nước"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Chuyến dã ngoại công ty đã tổ chức ở đâu?",
          "questionIntent": "Tìm địa điểm công viên / nơi chốn",
          "quickTip": "Nghe Where ➔ Bật ngay Ở ĐÂU!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "At a park next to a lake.",
            "In Central Park."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Hỏi ban tổ chức xem",
              "englishResponse": "Ask the planning committee.",
              "explanation": "Chỉ người phụ trách",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "At a park next to a lake.",
          "translation": "Tại một công viên nằm cạnh cái hồ nước.",
          "connectedSpeechNotes": [
            {
              "segment": "Where was the",
              "phoneticSpelling": "/wɛərəzðə/",
              "type": "linking",
              "explanation": "Nối âm lướt"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "In April.",
            "translation": "Vào tháng 4.",
            "trapType": "wrong_tense",
            "trapNameVi": "Bẫy thời gian (When)",
            "analysisVi": "Hỏi Where nhưng trả lời tháng 4 (When)."
          },
          {
            "letter": "B",
            "text": "Refreshments will be provided.",
            "translation": "Đồ ăn nhẹ sẽ được chuẩn bị.",
            "trapType": "association",
            "trapNameVi": "Bẫy liên tưởng đồ ăn picnic",
            "analysisVi": "Liên tưởng dã ngoại với đồ ăn nhẹ."
          }
        ]
      },
      {
        "id": 2905,
        "questionNumber": 2,
        "audioUrl": "/api/tts?q=Who%20is%20working%20at%20the%20front%20desk%20today%3F",
        "questionText": "Who is working at the front desk today?",
        "questionTranslation": "Ai sẽ làm việc tại quầy lễ tân vào hôm nay vậy?",
        "questionStem": {
          "text": "Who is",
          "type": "wh-question",
          "label": "Câu hỏi Người (Who)",
          "tip": "Tìm tên người cụ thể (Katie Miller), chức danh hoặc phòng ban."
        },
        "keywordsAndCollocations": [
          {
            "term": "front desk",
            "phonetic": "/frʌnt dɛsk/",
            "meaningVi": "quầy lễ tân"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Ai làm ở quầy lễ tân hôm nay?",
          "questionIntent": "Xác định nhân viên phụ trách quầy lễ tân",
          "quickTip": "Nghe Who ➔ Bật ngay TÊN NGƯỜI!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It's Katie Miller.",
            "Mr. Smith is on duty."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Lịch trực dán ở cửa",
              "englishResponse": "The schedule is posted on the door.",
              "explanation": "Dạng gián tiếp chỉ tài liệu",
              "category": "chi_tai_lieu"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "It's Katie Miller.",
          "translation": "Đó là Katie Miller.",
          "connectedSpeechNotes": [
            {
              "segment": "Who is working",
              "phoneticSpelling": "/huːɪz ˈwɜːkɪŋ/",
              "type": "linking",
              "explanation": "Nối Who is thành /huːɪz/"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "That's a difficult request.",
            "translation": "Đó là một yêu cầu khó.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề hoàn toàn",
            "analysisVi": "Không liên quan đến ai trực lễ tân."
          },
          {
            "letter": "C",
            "text": "Make room on your desk.",
            "translation": "Dọn chỗ trên bàn của bạn đi.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (desk)",
            "analysisVi": "Lặp lại từ \"desk\" để đánh lừa tai nghe."
          }
        ]
      }
    ]
  },
  {
    "id": "dictation-part2-unit2",
    "title": "Điền Từ Part 2 - Cụm 02: Câu 1 – 5",
    "description": "Trích từ Bài luyện nghe điền từ Part 2 (Module 12 - Phần 2). Rèn phản xạ câu hỏi và đáp án thường gặp.",
    "testSource": "Bài Luyện Nghe Điền Từ (Phần 2)",
    "difficulty": "Cơ bản (500+)",
    "badgeColor": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "sourceType": "dictation",
    "quizId": 32,
    "questions": [
      {
        "id": 2580,
        "questionNumber": 1,
        "audioUrl": "/api/tts?q=Where%20should%20I%20put%20the%20extra%20extension%20cords%3F",
        "questionText": "Where should I put the extra extension cords?",
        "questionTranslation": "Tôi nên đặt các dây nối thêm ở đâu?",
        "questionStem": {
          "text": "Where",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Tìm vị trí, phòng ban, địa chỉ, công viên. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "extension cords",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi nên đặt các dây nối thêm ở đâu?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Nơi chốn (Where)",
          "quickTip": "Nghe \"Where\" ➔ Bật ngay trọng tâm Câu hỏi Nơi chốn (Where)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "In the top drawer .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "In the top drawer .",
          "translation": "Trong ngăn kéo trên cùng.",
          "connectedSpeechNotes": [
            {
              "segment": "Where should I",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "The deadline is strict .",
            "translation": "Thời hạn rất nghiêm ngặt.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "After today's meeting .",
            "translation": "Sau cuộc họp hôm nay.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2581,
        "questionNumber": 2,
        "audioUrl": "/api/tts?q=How%20often%20should%20the%20window%20s%20be%20washed%3F",
        "questionText": "How often should the window s be washed?",
        "questionTranslation": "Bao lâu cửa sổ nên được lau chùi ?",
        "questionStem": {
          "text": "How often",
          "type": "wh-question",
          "label": "Câu hỏi Tần suất",
          "tip": "Tìm trạng từ chỉ tần suất (twice a year, once a week, daily)."
        },
        "keywordsAndCollocations": [
          {
            "term": "be washed",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bao lâu cửa sổ nên được lau chùi ?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Tần suất",
          "quickTip": "Nghe \"How often\" ➔ Bật ngay trọng tâm Câu hỏi Tần suất!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "At least twice a year.",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "At least twice a year.",
          "translation": "Ít nhất hai lần một năm.",
          "connectedSpeechNotes": [
            {
              "segment": "How often should",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Please pass me my glasses .",
            "translation": "Vui lòng chuyển cho tôi kính của tôi.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Friday , March 3.",
            "translation": "Thứ Sáu, ngày 3 tháng Ba.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2582,
        "questionNumber": 3,
        "audioUrl": "/api/tts?q=I'd%20be%20happy%20to%20make%20you%20dinner%20.",
        "questionText": "I'd be happy to make you dinner .",
        "questionTranslation": "Tôi rất vui khi làm bữa tối cho bạn.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "dinner ",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi rất vui khi làm bữa tối cho bạn.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "At most 50 dollars .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "At most 50 dollars .",
          "translation": "Nhiều nhất là 50 đô la.",
          "connectedSpeechNotes": [
            {
              "segment": "I'd be happy",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Thanks, but let’s go out .",
            "translation": "Cảm ơn, nhưng chúng ta hãy đi ra ngoài ăn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "It was wonderful .",
            "translation": "Thật tuyệt vời.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2583,
        "questionNumber": 4,
        "audioUrl": "/api/tts?q=Which%20shoes%20fit%20you%20best%3F",
        "questionText": "Which shoes fit you best?",
        "questionTranslation": "Đôi giày nào phù hợp với bạn nhất?",
        "questionStem": {
          "text": "Which",
          "type": "wh-question",
          "label": "Câu hỏi Lựa chọn (Which)",
          "tip": "Tìm phương án được chỉ định (The red one, That option, Either is fine)."
        },
        "keywordsAndCollocations": [
          {
            "term": "you best",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Đôi giày nào phù hợp với bạn nhất?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lựa chọn (Which)",
          "quickTip": "Nghe \"Which\" ➔ Bật ngay trọng tâm Câu hỏi Lựa chọn (Which)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "The striped one s.",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "The striped one s.",
          "translation": "Đôi kẻ sọc ý",
          "connectedSpeechNotes": [
            {
              "segment": "Which shoes fit",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "He's physically fit .",
            "translation": "Anh ấy khỏe mạnh.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "Make sure to tie them tight .",
            "translation": "Đảm bảo buộc chúng thật chặt.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2584,
        "questionNumber": 5,
        "audioUrl": "/api/tts?q=Is%20this%20the%20theater%20box%20office%3F",
        "questionText": "Is this the theater box office?",
        "questionTranslation": "Đây có phải là phòng vé của rạp chiếu phim không?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "box office",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Đây có phải là phòng vé của rạp chiếu phim không?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, you can buy tickets here .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Yes, you can buy tickets here .",
          "translation": "Đúng vậy, bạn có thể mua vé tại đây.",
          "connectedSpeechNotes": [
            {
              "segment": "Is this the",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "The head office is in Chicago.",
            "translation": "Trụ sở chính ở Chicago.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (office)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"office\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "The play was impressive .",
            "translation": "Vở kịch rất ấn tượng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "dictation-part2-unit3",
    "title": "Điền Từ Part 2 - Cụm 03: Câu 6 – 10",
    "description": "Trích từ Bài luyện nghe điền từ Part 2 (Module 12 - Phần 2). Rèn phản xạ câu hỏi và đáp án thường gặp.",
    "testSource": "Bài Luyện Nghe Điền Từ (Phần 2)",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "sourceType": "dictation",
    "quizId": 32,
    "questions": [
      {
        "id": 2585,
        "questionNumber": 6,
        "audioUrl": "/api/tts?q=Where%20is%20the%20entrance%20to%20the%20parking%20garage%3F",
        "questionText": "Where is the entrance to the parking garage?",
        "questionTranslation": "Lối vào nhà để xe ở đâu?",
        "questionStem": {
          "text": "Where is / Where are",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Tìm giới từ chỉ nơi chốn (at, in, on, next to...) hoặc vị trí. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "parking garage",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Lối vào nhà để xe ở đâu?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Nơi chốn (Where)",
          "quickTip": "Nghe \"Where is / Where are\" ➔ Bật ngay trọng tâm Câu hỏi Nơi chốn (Where)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Take a right turn up ahead .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Take a right turn up ahead .",
          "translation": "Rẽ phải lên phía trước.",
          "connectedSpeechNotes": [
            {
              "segment": "Where is the",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "It's $10 per hour .",
            "translation": "Khoảng $10 mỗi giờ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "The entrance exam was difficult .",
            "translation": "Kỳ thi tuyển sinh thật khó.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (entrance)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"entrance\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      },
      {
        "id": 2586,
        "questionNumber": 7,
        "audioUrl": "/api/tts?q=Do%20you%20have%20the%20key%20to%20the%20meeting%20room%20or%20should%20I%20ask%20someone%20else%3F",
        "questionText": "Do you have the key to the meeting room or should I ask someone else?",
        "questionTranslation": "Bạn có chìa khóa phòng họp không hay tôi nên hỏi người khác?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "someone else",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có chìa khóa phòng họp không hay tôi nên hỏi người khác?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I think I have it in my desk .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "I think I have it in my desk .",
          "translation": "Tôi nghĩ tôi để nó trong bàn làm việc.",
          "connectedSpeechNotes": [
            {
              "segment": "Do you have",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "The meeting will last over an hour .",
            "translation": "Cuộc họp sẽ kéo dài hơn một giờ.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (meeting)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"meeting\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "It's a key factor .",
            "translation": "Đó là một yếu tố quan trọng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2587,
        "questionNumber": 8,
        "audioUrl": "/api/tts?q=Did%20Mark%20submit%20a%20proposal%20yet%3F",
        "questionText": "Did Mark submit a proposal yet?",
        "questionTranslation": "Mark đã gửi bản đề xuất chưa?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "proposal yet",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Mark đã gửi bản đề xuất chưa?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Print it double -sided.",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Print it double -sided.",
          "translation": "In hai mặt.",
          "connectedSpeechNotes": [
            {
              "segment": "Did Mark submit",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Yes, he's in charge of waste disposal .",
            "translation": "Vâng, anh ấy phụ trách xử lý chất thải.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "No, he is still working on it.",
            "translation": "Chưa, anh ấy vẫn đang làm việc đó.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2588,
        "questionNumber": 9,
        "audioUrl": "/api/tts?q=Would%20you%20please%20help%20Janet%20move%20that%20table%3F",
        "questionText": "Would you please help Janet move that table?",
        "questionTranslation": "Bạn có thể sẵn lòng giúp Janet di chuyển cái bàn đó không?",
        "questionStem": {
          "text": "Can / Could / Will you",
          "type": "request-offer",
          "label": "Câu hỏi Yêu cầu / Đề nghị",
          "tip": "Đáp lại bằng sự đồng ý (Sure, certainly, no problem) hoặc từ chối lịch sự kèm lý do."
        },
        "keywordsAndCollocations": [
          {
            "term": "that table",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có thể sẵn lòng giúp Janet di chuyển cái bàn đó không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yêu cầu / Đề nghị",
          "quickTip": "Nghe \"Can / Could / Will you\" ➔ Bật ngay trọng tâm Câu hỏi Yêu cầu / Đề nghị!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, she made a great impression .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Yes, she made a great impression .",
          "translation": "Vâng, cô ấy đã gây ấn tượng tuyệt vời.",
          "connectedSpeechNotes": [
            {
              "segment": "Would you please",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Where should we put it?",
            "translation": "Chúng ta nên đặt nó ở đâu?",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "On the third floor.",
            "translation": "Trên tầng ba",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2589,
        "questionNumber": 10,
        "audioUrl": "/api/tts?q=What%20style%20of%20dress%20do%20you%20want%20to%20buy%3F",
        "questionText": "What style of dress do you want to buy?",
        "questionTranslation": "Bạn muốn mua kiểu váy nào?",
        "questionStem": {
          "text": "What",
          "type": "wh-question",
          "label": "Câu hỏi Thông tin (What)",
          "tip": "Bắt danh từ trọng tâm hoặc thông tin được yêu cầu."
        },
        "keywordsAndCollocations": [
          {
            "term": "to buy",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn muốn mua kiểu váy nào?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thông tin (What)",
          "quickTip": "Nghe \"What\" ➔ Bật ngay trọng tâm Câu hỏi Thông tin (What)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I'd like to try this on .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "I'd like to try this on .",
          "translation": "Tôi muốn thử cái này.",
          "connectedSpeechNotes": [
            {
              "segment": "What style of",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "In the dressing room .",
            "translation": "Trong phòng thay đồ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Something appropriate for summer .",
            "translation": "Một cái gì đó thích hợp cho mùa hè",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "dictation-part2-unit4",
    "title": "Điền Từ Part 2 - Cụm 04: Câu 11 – 15",
    "description": "Trích từ Bài luyện nghe điền từ Part 2 (Module 12 - Phần 2). Rèn phản xạ câu hỏi và đáp án thường gặp.",
    "testSource": "Bài Luyện Nghe Điền Từ (Phần 2)",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "sourceType": "dictation",
    "quizId": 32,
    "questions": [
      {
        "id": 2590,
        "questionNumber": 11,
        "audioUrl": "/api/tts?q=When%20is%20the%20new%20department%20store%20scheduled%20to%20open%3F",
        "questionText": "When is the new department store scheduled to open?",
        "questionTranslation": "Cửa hàng bách hóa mới dự kiến mở lúc nào vậy?",
        "questionStem": {
          "text": "When",
          "type": "wh-question",
          "label": "Câu hỏi Thời gian (When)",
          "tip": "Tìm mốc thời gian (giờ, ngày, tháng, liên từ until/after/before). Tuyệt đối tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "to open",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Cửa hàng bách hóa mới dự kiến mở lúc nào vậy?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thời gian (When)",
          "quickTip": "Nghe \"When\" ➔ Bật ngay trọng tâm Câu hỏi Thời gian (When)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I never opened it.",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "I never opened it.",
          "translation": "Tôi chưa bao giờ mở nó.",
          "connectedSpeechNotes": [
            {
              "segment": "When is the",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "In time for Christmas .",
            "translation": "Khoảng thời gian vào Giáng sinh.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Yes, you can use a shopping cart .",
            "translation": "Có, bạn có thể sử dụng giỏ hàng.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          }
        ]
      },
      {
        "id": 2591,
        "questionNumber": 12,
        "audioUrl": "/api/tts?q=The%20advertisement%20has%20been%20effective%20%2C%20hasn%E2%80%99t%20it%3F",
        "questionText": "The advertisement has been effective , hasn’t it?",
        "questionTranslation": "Quảng cáo hiệu quả, phải không?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "hasnt it",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Quảng cáo hiệu quả, phải không?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, sales have increased .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Yes, sales have increased .",
          "translation": "Đúng vậy, doanh số bán hàng đã tăng lên.",
          "connectedSpeechNotes": [
            {
              "segment": "The advertisement has",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "No, it was an Internet advertisement.",
            "translation": "Không, đó là một quảng cáo trên Internet.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (advertisement)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"advertisement\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "Turn on the television .",
            "translation": "Bật TV lên đi",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2592,
        "questionNumber": 13,
        "audioUrl": "/api/tts?q=How%20can%20I%20help%20out%3F",
        "questionText": "How can I help out?",
        "questionTranslation": "Tôi có thể giúp gì?",
        "questionStem": {
          "text": "How",
          "type": "wh-question",
          "label": "Câu hỏi Phương thức (How)",
          "tip": "Tìm phương tiện (by bus, online) hoặc cách thức thực hiện."
        },
        "keywordsAndCollocations": [
          {
            "term": "help out",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi có thể giúp gì?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Phương thức (How)",
          "quickTip": "Nghe \"How\" ➔ Bật ngay trọng tâm Câu hỏi Phương thức (How)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It was helpful .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "It was helpful .",
          "translation": "Nó rất hữu ích.",
          "connectedSpeechNotes": [
            {
              "segment": "How can I",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "I was inside the room .",
            "translation": "Tôi đã ở trong phòng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "You could wash the dishes .",
            "translation": "Bạn có thể rửa bát đĩa.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2593,
        "questionNumber": 14,
        "audioUrl": "/api/tts?q=Why%20hasn't%20the%20delivery%20person%20come%20all%20this%20week%3F",
        "questionText": "Why hasn't the delivery person come all this week?",
        "questionTranslation": "Sao cả tuần nay người giao hàng vẫn chưa đến?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "this week",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Sao cả tuần nay người giao hàng vẫn chưa đến?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "No, I read it in the newspaper .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "No, I read it in the newspaper .",
          "translation": "Không, tôi đã đọc nó trên báo.",
          "connectedSpeechNotes": [
            {
              "segment": "Why hasn't the",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "I heard he was sick .",
            "translation": "Tôi nghe nói anh ấy bị ốm.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "I think it's $5",
            "translation": "Tôi nghĩ nó có giá $5",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2594,
        "questionNumber": 15,
        "audioUrl": "/api/tts?q=I%20don't%20expect%20to%20be%20able%20to%20finish%20this%20work%20in%20time.",
        "questionText": "I don't expect to be able to finish this work in time.",
        "questionTranslation": "Tôi không mong đợi có thể hoàn thành công việc này kịp giờ.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "in time",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi không mong đợi có thể hoàn thành công việc này kịp giờ.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Maybe you should ask for help.",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Maybe you should ask for help.",
          "translation": "Có lẽ bạn nên nhờ giúp đỡ.",
          "connectedSpeechNotes": [
            {
              "segment": "I don't expect",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "A finished product .",
            "translation": "Một thành phẩm.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "We should inspect the equipment .",
            "translation": "Chúng ta nên kiểm tra thiết bị.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "dictation-part2-unit5",
    "title": "Điền Từ Part 2 - Cụm 05: Câu 16 – 20",
    "description": "Trích từ Bài luyện nghe điền từ Part 2 (Module 12 - Phần 2). Rèn phản xạ câu hỏi và đáp án thường gặp.",
    "testSource": "Bài Luyện Nghe Điền Từ (Phần 2)",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "sourceType": "dictation",
    "quizId": 32,
    "questions": [
      {
        "id": 2595,
        "questionNumber": 16,
        "audioUrl": "/api/tts?q=Why%20don't%20you%20buy%20a%20new%20suit%20for%20the%20presentation%3F",
        "questionText": "Why don't you buy a new suit for the presentation?",
        "questionTranslation": "Tại sao bạn không mua một bộ đồ mới cho buổi thuyết trình?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "the presentation",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tại sao bạn không mua một bộ đồ mới cho buổi thuyết trình?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Hmm ... I'll follow your advice .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Hmm ... I'll follow your advice .",
          "translation": "Hmm ... Tôi sẽ làm theo lời khuyên của bạn.",
          "connectedSpeechNotes": [
            {
              "segment": "Why don't you",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Did you win the award ?",
            "translation": "Bạn đã giành được giải thưởng?",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "It'll suit your company's needs .",
            "translation": "Nó sẽ phù hợp với nhu cầu của công ty bạn",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (suit)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"suit\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      },
      {
        "id": 2596,
        "questionNumber": 17,
        "audioUrl": "/api/tts?q=Where%20can%20I%20call%20a%20taxi%3F",
        "questionText": "Where can I call a taxi?",
        "questionTranslation": "Tôi có thể gọi taxi ở đâu?",
        "questionStem": {
          "text": "Where",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Tìm vị trí, phòng ban, địa chỉ, công viên. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "a taxi",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi có thể gọi taxi ở đâu?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Nơi chốn (Where)",
          "quickTip": "Nghe \"Where\" ➔ Bật ngay trọng tâm Câu hỏi Nơi chốn (Where)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Today at 3:00 P.M.",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Today at 3:00 P.M.",
          "translation": "Hôm nay lúc 3:00 chiều.",
          "connectedSpeechNotes": [
            {
              "segment": "Where can I",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "At the intersection over there .",
            "translation": "Tại ngã tư đằng kia.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "No, there is no tax on this.",
            "translation": "Không, cái này không có thuế.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          }
        ]
      },
      {
        "id": 2597,
        "questionNumber": 18,
        "audioUrl": "/api/tts?q=We%20had%20dinner%20at%20the%20new%20Italian%20restaurant%20last%20night.",
        "questionText": "We had dinner at the new Italian restaurant last night.",
        "questionTranslation": "Chúng tôi đã ăn tối tại nhà hàng Ý mới vào đêm qua.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "last night",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Chúng tôi đã ăn tối tại nhà hàng Ý mới vào đêm qua.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, he's a chef from Milan .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Yes, he's a chef from Milan .",
          "translation": "Vâng, anh ấy là một đầu bếp từ Milan.",
          "connectedSpeechNotes": [
            {
              "segment": "We had dinner",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "You will have a good time.",
            "translation": "Bạn sẽ có một khoảng thời gian vui vẻ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "I still haven’t been there .",
            "translation": "Tôi vẫn chưa đến đó.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2598,
        "questionNumber": 19,
        "audioUrl": "/api/tts?q=The%20merger%20hasn't%20been%20finalized%20yet%2C%20has%20it%3F",
        "questionText": "The merger hasn't been finalized yet, has it?",
        "questionTranslation": "Việc sáp nhập vẫn chưa được hoàn tất, phải không?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "has it",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Việc sáp nhập vẫn chưa được hoàn tất, phải không?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "No, but it will be soon .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "No, but it will be soon .",
          "translation": "Không, nhưng sẽ sớm thôi.",
          "connectedSpeechNotes": [
            {
              "segment": "The merger hasn't",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "They exceeded the initial sales forecast .",
            "translation": "Họ đã vượt quá dự báo bán hàng ban đầu.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "I'll return it by the end of the day.",
            "translation": "Tôi sẽ trả lại vào cuối ngày.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2599,
        "questionNumber": 20,
        "audioUrl": "/api/tts?q=Who%20reserved%20the%20convention%20center%3F",
        "questionText": "Who reserved the convention center?",
        "questionTranslation": "Ai đã đặt trung tâm hội nghị vậy?",
        "questionStem": {
          "text": "Who",
          "type": "wh-question",
          "label": "Câu hỏi Người (Who)",
          "tip": "Tìm tên người, chức danh (manager, assistant, director), phòng ban hoặc câu gián tiếp."
        },
        "keywordsAndCollocations": [
          {
            "term": "convention center",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Ai đã đặt trung tâm hội nghị vậy?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Người (Who)",
          "quickTip": "Nghe \"Who\" ➔ Bật ngay trọng tâm Câu hỏi Người (Who)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "She deserved the award .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "She deserved the award .",
          "translation": "Cô ấy xứng đáng với giải thưởng.",
          "connectedSpeechNotes": [
            {
              "segment": "Who reserved the",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "It's located near a subway station.",
            "translation": "Nó nằm gần một ga tàu điện ngầm.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "An election candidate .",
            "translation": "Một ứng cử viên bầu cử.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "dictation-part2-unit6",
    "title": "Điền Từ Part 2 - Cụm 06: Câu 21 – 25",
    "description": "Trích từ Bài luyện nghe điền từ Part 2 (Module 12 - Phần 2). Rèn phản xạ câu hỏi và đáp án thường gặp.",
    "testSource": "Bài Luyện Nghe Điền Từ (Phần 2)",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    "sourceType": "dictation",
    "quizId": 32,
    "questions": [
      {
        "id": 2600,
        "questionNumber": 21,
        "audioUrl": "/api/tts?q=Don't%20you%20need%20to%20get%20to%20the%20airport%20at%20least%20three%20hours%20early%3F",
        "questionText": "Don't you need to get to the airport at least three hours early?",
        "questionTranslation": "Bạn không cần đến sân bay sớm ít nhất ba giờ à?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "hours early",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn không cần đến sân bay sớm ít nhất ba giờ à?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "No, that's unnecessary .",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "No, that's unnecessary .",
          "translation": "Không, điều đó không cần thiết.",
          "connectedSpeechNotes": [
            {
              "segment": "Don't you need",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "I need a few hours to read it.",
            "translation": "Tôi cần một vài giờ để đọc nó.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (need)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"need\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "She lost her boarding pass.",
            "translation": "Cô ấy bị mất thẻ lên máy bay.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2601,
        "questionNumber": 22,
        "audioUrl": "/api/tts?q=Why%20don't%20we%20take%20a%20tour%20of%20the%20house%3F",
        "questionText": "Why don't we take a tour of the house?",
        "questionTranslation": "Tại sao chúng ta không tham quan ngôi nhà?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "the house",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tại sao chúng ta không tham quan ngôi nhà?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Sure, I'd like to take a look too.",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Sure, I'd like to take a look too.",
          "translation": "Chắc chắn rồi, tôi cũng muốn xem qua.",
          "connectedSpeechNotes": [
            {
              "segment": "Why don't we",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "No, I already saw this exhibit .",
            "translation": "Không, tôi đã xem triển lãm này.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          },
          {
            "letter": "C",
            "text": "Because the tenant will be moving out soon.",
            "translation": "Vì người thuê nhà sẽ sớm chuyển đi.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2602,
        "questionNumber": 23,
        "audioUrl": "/api/tts?q=How%20long%20has%20this%20company%20been%20in%20business%3F",
        "questionText": "How long has this company been in business?",
        "questionTranslation": "Công ty này đã kinh doanh được bao lâu?",
        "questionStem": {
          "text": "How long",
          "type": "wh-question",
          "label": "Câu hỏi Khoảng thời gian",
          "tip": "Tìm khoảng thời gian (for 2 weeks, three days), khác với When (mốc thời gian)."
        },
        "keywordsAndCollocations": [
          {
            "term": "in business",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Công ty này đã kinh doanh được bao lâu?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Khoảng thời gian",
          "quickTip": "Nghe \"How long\" ➔ Bật ngay trọng tâm Câu hỏi Khoảng thời gian!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "The meeting is at five o'clock.",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "The meeting is at five o'clock.",
          "translation": "Cuộc họp lúc 5 giờ.",
          "connectedSpeechNotes": [
            {
              "segment": "How long has",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "It was founded in 1958 .",
            "translation": "Nó được thành lập vào năm 1958.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "It's around 5 meters, I guess.",
            "translation": "Tôi đoán là khoảng 5 mét.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2603,
        "questionNumber": 24,
        "audioUrl": "/api/tts?q=Jonathan%20knows%20the%20sale%20s%20figures%20.",
        "questionText": "Jonathan knows the sale s figures .",
        "questionTranslation": "Jonathan biết các số liệu bán hàng.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "figures ",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Jonathan biết các số liệu bán hàng.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Is he in the office now?",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Is he in the office now?",
          "translation": "Bây giờ anh ấy có ở văn phòng không?",
          "connectedSpeechNotes": [
            {
              "segment": "Jonathan knows the",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Enter the figures in the spreadsheet .",
            "translation": "Nhập các số liệu vào bảng tính.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (figures)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"figures\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "I can't figure out what's going on.",
            "translation": "Tôi không thể hiểu chuyện gì đang xảy ra.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 2604,
        "questionNumber": 25,
        "audioUrl": "/api/tts?q=Shall%20we%20ship%20this%20package%20at%20an%20express%20or%20normal%20rate%3F",
        "questionText": "Shall we ship this package at an express or normal rate?",
        "questionTranslation": "Chúng ta sẽ gửi gói hàng này với tốc độ nhanh hay bình thường?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "normal rate",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Chúng ta sẽ gửi gói hàng này với tốc độ nhanh hay bình thường?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It was a very large ship.",
            "I haven't been informed yet."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ",
              "englishResponse": "I'm not sure.",
              "explanation": "Né tránh thông tin",
              "category": "khong_biet"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "It was a very large ship.",
          "translation": "Đó là một con tàu rất lớn.",
          "connectedSpeechNotes": [
            {
              "segment": "Shall we ship",
              "phoneticSpelling": "Linking sound",
              "type": "linking",
              "explanation": "Nối âm tự nhiên"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "It's not an urgent shipment .",
            "translation": "Đây không phải là một lô hàng khẩn cấp.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Due to the high unemployment rate.",
            "translation": "Do tỷ lệ thất nghiệp cao.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (rate)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"rate\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-01-q7-q11",
    "title": "Đề Thi Fulltest 01: Câu 7 – 11",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 01.",
    "testSource": "ETS TOEIC Đề 01",
    "difficulty": "Cơ bản (500+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 802,
    "questions": [
      {
        "id": 30737,
        "questionNumber": 7,
        "audioUrl": "/api/tts?q=Why%20was%20this%20afternoon's%20meeting%20canceled%3F",
        "questionText": "Why was this afternoon's meeting canceled?",
        "questionTranslation": "Tại sao cuộc họp chiều nay bị hủy vậy?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "meeting canceled",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tại sao cuộc họp chiều nay bị hủy vậy?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Because the manager is out of the office.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Because the manager is out of the office.",
          "translation": "Bởi vì giám đốc không có mặt tại văn phòng.",
          "connectedSpeechNotes": [
            {
              "segment": "Why was this",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Room 206, I think.",
            "translation": "Phòng 206, tôi nghĩ vậy.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Let's review the itinerary for our trip.",
            "translation": "Hãy xem lại hành trình cho chuyến đi của chúng ta.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30738,
        "questionNumber": 8,
        "audioUrl": "/api/tts?q=You%20use%20the%20company%20fitness%20center%2C%20don't%20you%3F",
        "questionText": "You use the company fitness center, don't you?",
        "questionTranslation": "Bạn sử dụng trung tâm thể hình của công ty, phải không?",
        "questionStem": {
          "text": "Tag Question (...right?)",
          "type": "tag-question",
          "label": "Câu hỏi Đuôi / Xác nhận",
          "tip": "Tìm kiếm sự xác nhận thông tin. Thường trả lời bằng Yes/No hoặc đính chính thông tin."
        },
        "keywordsAndCollocations": [
          {
            "term": "dont you",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn sử dụng trung tâm thể hình của công ty, phải không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Đuôi / Xác nhận",
          "quickTip": "Nghe \"Tag Question (...right?)\" ➔ Bật ngay trọng tâm Câu hỏi Đuôi / Xác nhận!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, every now and then.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Yes, every now and then.",
          "translation": "Có, thỉnh thoảng.",
          "connectedSpeechNotes": [
            {
              "segment": "You use the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Please center the text on the page.",
            "translation": "Vui lòng căn giữa văn bản trên trang.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (center)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"center\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "I think it fits you well.",
            "translation": "Tôi nghĩ nó phù hợp với bạn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30739,
        "questionNumber": 9,
        "audioUrl": "/api/tts?q=Do%20you%20have%20the%20images%20from%20the%20graphics%20department%3F",
        "questionText": "Do you have the images from the graphics department?",
        "questionTranslation": "Bạn có những hình ảnh từ bộ phận đồ họa không?",
        "questionStem": {
          "text": "Yes/No Question",
          "type": "yes-no",
          "label": "Câu hỏi Yes/No",
          "tip": "Có thể trả lời trực tiếp bằng Yes/No hoặc trả lời gián tiếp bằng tình huống thực tế."
        },
        "keywordsAndCollocations": [
          {
            "term": "graphics department",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có những hình ảnh từ bộ phận đồ họa không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yes/No",
          "quickTip": "Nghe \"Yes/No Question\" ➔ Bật ngay trọng tâm Câu hỏi Yes/No!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "No, they're not ready yet.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "No, they're not ready yet.",
          "translation": "Chưa, chúng vẫn chưa xong.",
          "connectedSpeechNotes": [
            {
              "segment": "Do you have",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "OK, that won't be a problem.",
            "translation": "OK, đó sẽ không phải là vấn đề.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "A high-definition camera.",
            "translation": "Một máy ảnh độ nét cao.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30740,
        "questionNumber": 10,
        "audioUrl": "/api/tts?q=When%20are%20you%20moving%20to%20your%20new%20office%3F",
        "questionText": "When are you moving to your new office?",
        "questionTranslation": "Khi nào bạn chuyển đến văn phòng mới?",
        "questionStem": {
          "text": "When",
          "type": "wh-question",
          "label": "Câu hỏi Thời gian (When)",
          "tip": "Tìm mốc thời gian (giờ, ngày, tháng, liên từ until/after/before). Tuyệt đối tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "your office",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Khi nào bạn chuyển đến văn phòng mới?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thời gian (When)",
          "quickTip": "Nghe \"When\" ➔ Bật ngay trọng tâm Câu hỏi Thời gian (When)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "The schedule is being revised.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "The schedule is being revised.",
          "translation": "Lịch trình đang được sửa đổi.",
          "connectedSpeechNotes": [
            {
              "segment": "When are you",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "The office printer over there.",
            "translation": "Máy in văn phòng ở đó.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (office)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"office\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "B",
            "text": "The water bill is high this month.",
            "translation": "Hóa đơn tiền nước tháng này cao.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30741,
        "questionNumber": 11,
        "audioUrl": "/api/tts?q=Would%20you%20like%20to%20sign%20up%20for%20the%20company%20retreat%3F",
        "questionText": "Would you like to sign up for the company retreat?",
        "questionTranslation": "Bạn có muốn đăng ký tham gia buổi chiêu đãi của công ty không?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "company retreat",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có muốn đăng ký tham gia buổi chiêu đãi của công ty không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Sure, I’ll write my name down.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Sure, I’ll write my name down.",
          "translation": "Chắc chắn rồi, tôi sẽ ghi tên của mình.",
          "connectedSpeechNotes": [
            {
              "segment": "Would you like",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Twenty people, maximum.",
            "translation": "Tối đa là 20 người.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Can I replace the sign?",
            "translation": "Tôi có thể thay biển hiệu không?",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (sign)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"sign\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-01-q12-q16",
    "title": "Đề Thi Fulltest 01: Câu 12 – 16",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 01.",
    "testSource": "ETS TOEIC Đề 01",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 802,
    "questions": [
      {
        "id": 30742,
        "questionNumber": 12,
        "audioUrl": "/api/tts?q=How%20often%20do%20I%20have%20to%20submit%20my%20time%20sheet%3F",
        "questionText": "How often do I have to submit my time sheet?",
        "questionTranslation": "Tôi phải nộp thời gian biểu của mình bao lâu một lần?",
        "questionStem": {
          "text": "How often",
          "type": "wh-question",
          "label": "Câu hỏi Tần suất",
          "tip": "Tìm trạng từ chỉ tần suất (twice a year, once a week, daily)."
        },
        "keywordsAndCollocations": [
          {
            "term": "time sheet",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi phải nộp thời gian biểu của mình bao lâu một lần?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Tần suất",
          "quickTip": "Nghe \"How often\" ➔ Bật ngay trọng tâm Câu hỏi Tần suất!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "You need to do it once a week.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "You need to do it once a week.",
          "translation": "Bạn cần làm điều đó mỗi tuần một lần.",
          "connectedSpeechNotes": [
            {
              "segment": "How often do",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Five sheets of paper.",
            "translation": "Năm tờ giấy.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "No, I don't usually wear a watch.",
            "translation": "Không, tôi không thường đeo đồng hồ.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          }
        ]
      },
      {
        "id": 30743,
        "questionNumber": 13,
        "audioUrl": "/api/tts?q=I%20can%20buy%20a%20monthly%20gym%20membership%2C%20right%3F",
        "questionText": "I can buy a monthly gym membership, right?",
        "questionTranslation": "Tôi có thể mua một thẻ thành viên phòng tập thể dục hàng tháng, phải không?",
        "questionStem": {
          "text": "Tag Question (...right?)",
          "type": "tag-question",
          "label": "Câu hỏi Đuôi / Xác nhận",
          "tip": "Tìm kiếm sự xác nhận thông tin. Thường trả lời bằng Yes/No hoặc đính chính thông tin."
        },
        "keywordsAndCollocations": [
          {
            "term": "membership right",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi có thể mua một thẻ thành viên phòng tập thể dục hàng tháng, phải không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Đuôi / Xác nhận",
          "quickTip": "Nghe \"Tag Question (...right?)\" ➔ Bật ngay trọng tâm Câu hỏi Đuôi / Xác nhận!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, at the front desk.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Yes, at the front desk.",
          "translation": "Được chứ, ở quầy lễ tân.",
          "connectedSpeechNotes": [
            {
              "segment": "I can buy",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "A very popular exercise routine.",
            "translation": "Một thói quen tập thể dục rất phổ biến.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "The exercise room is on your right.",
            "translation": "Phòng tập ở bên phải bạn.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (right)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"right\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      },
      {
        "id": 30744,
        "questionNumber": 14,
        "audioUrl": "/api/tts?q=Have%20you%20put%20price%20tags%20on%20all%20the%20clearance%20items%3F",
        "questionText": "Have you put price tags on all the clearance items?",
        "questionTranslation": "Bạn đã gắn nhãn giá trên tất cả các sản phẩm bán hạ giá hàng tồn kho chưa?",
        "questionStem": {
          "text": "Yes/No Question",
          "type": "yes-no",
          "label": "Câu hỏi Yes/No",
          "tip": "Có thể trả lời trực tiếp bằng Yes/No hoặc trả lời gián tiếp bằng tình huống thực tế."
        },
        "keywordsAndCollocations": [
          {
            "term": "clearance items",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn đã gắn nhãn giá trên tất cả các sản phẩm bán hạ giá hàng tồn kho chưa?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yes/No",
          "quickTip": "Nghe \"Yes/No Question\" ➔ Bật ngay trọng tâm Câu hỏi Yes/No!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, everything's been labeled.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Yes, everything's been labeled.",
          "translation": "Có, mọi thứ đã được dán nhãn.",
          "connectedSpeechNotes": [
            {
              "segment": "Have you put",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "It is a little cloudy.",
            "translation": "Trời có một chút mây.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Where is your name tag?",
            "translation": "Thẻ tên của bạn ở đâu?",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30745,
        "questionNumber": 15,
        "audioUrl": "/api/tts?q=Don%E2%80%99t%20we%20still%20need%20to%20change%20the%20newspaper%20layout%3F",
        "questionText": "Don’t we still need to change the newspaper layout?",
        "questionTranslation": "Chúng ta vẫn không cần thay đổi bố cục tờ báo sao?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "newspaper layout",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Chúng ta vẫn không cần thay đổi bố cục tờ báo sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "No, it's already been changed.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "No, it's already been changed.",
          "translation": "Không, nó đã được thay đổi rồi mà.",
          "connectedSpeechNotes": [
            {
              "segment": "Don’t we still",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Down the hall on your right.",
            "translation": "Đi xuống hành lang bên phải bạn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "A new computer program.",
            "translation": "Một chương trình máy tính mới.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30746,
        "questionNumber": 16,
        "audioUrl": "/api/tts?q=What's%20the%20total%20cost%20of%20the%20repair%20work%3F",
        "questionText": "What's the total cost of the repair work?",
        "questionTranslation": "Tổng chi phí sửa chữa là bao nhiêu?",
        "questionStem": {
          "text": "What",
          "type": "wh-question",
          "label": "Câu hỏi Thông tin (What)",
          "tip": "Bắt danh từ trọng tâm hoặc thông tin được yêu cầu."
        },
        "keywordsAndCollocations": [
          {
            "term": "repair work",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tổng chi phí sửa chữa là bao nhiêu?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thông tin (What)",
          "quickTip": "Nghe \"What\" ➔ Bật ngay trọng tâm Câu hỏi Thông tin (What)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It's free because of the warranty.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "It's free because of the warranty.",
          "translation": "Nó miễn phí vì có bảo hành.",
          "connectedSpeechNotes": [
            {
              "segment": "What's the total",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "I have some boxes you can use.",
            "translation": "Tôi có một số hộp bạn có thể sử dụng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "In a couple of hours.",
            "translation": "Trong một vài giờ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-01-q17-q21",
    "title": "Đề Thi Fulltest 01: Câu 17 – 21",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 01.",
    "testSource": "ETS TOEIC Đề 01",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 802,
    "questions": [
      {
        "id": 30747,
        "questionNumber": 17,
        "audioUrl": "/api/tts?q=Where%20can%20I%20get%20a%20new%20filing%20cabinet%3F",
        "questionText": "Where can I get a new filing cabinet?",
        "questionTranslation": "Tôi có thể lấy tủ tài liệu mới ở đâu?",
        "questionStem": {
          "text": "Where",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Tìm vị trí, phòng ban, địa chỉ, công viên. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "filing cabinet",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi có thể lấy tủ tài liệu mới ở đâu?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Nơi chốn (Where)",
          "quickTip": "Nghe \"Where\" ➔ Bật ngay trọng tâm Câu hỏi Nơi chốn (Where)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "All furniture requests must be approved first.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "All furniture requests must be approved first.",
          "translation": "Tất cả các yêu cầu về đồ đạc phải được chấp thuận trước.",
          "connectedSpeechNotes": [
            {
              "segment": "Where can I",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "All of the cabins have been rented.",
            "translation": "Tất cả các cabin đã được thuê.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "I'll put the tiles in the corner.",
            "translation": "Tôi sẽ đặt gạch vào góc.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30748,
        "questionNumber": 18,
        "audioUrl": "/api/tts?q=How%20do%20I%20reset%20my%20password%3F",
        "questionText": "How do I reset my password?",
        "questionTranslation": "Làm thế nào để tôi đặt lại mật khẩu của mình?",
        "questionStem": {
          "text": "How",
          "type": "wh-question",
          "label": "Câu hỏi Phương thức (How)",
          "tip": "Tìm phương tiện (by bus, online) hoặc cách thức thực hiện."
        },
        "keywordsAndCollocations": [
          {
            "term": "reset password",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Làm thế nào để tôi đặt lại mật khẩu của mình?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Phương thức (How)",
          "quickTip": "Nghe \"How\" ➔ Bật ngay trọng tâm Câu hỏi Phương thức (How)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "You should call the help desk.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "You should call the help desk.",
          "translation": "Bạn nên gọi cho bộ phận hỗ trợ.",
          "connectedSpeechNotes": [
            {
              "segment": "How do I",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "By the end of the month.",
            "translation": "Đến cuối tháng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Thanks for setting the table.",
            "translation": "Cảm ơn vì đã đặt bàn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30749,
        "questionNumber": 19,
        "audioUrl": "/api/tts?q=Could%20you%20check%20to%20see%20if%20that%20monitor%20is%20plugged%20in%3F",
        "questionText": "Could you check to see if that monitor is plugged in?",
        "questionTranslation": "Bạn có thể kiểm tra xem màn hình đó đã được cắm chưa không?",
        "questionStem": {
          "text": "Can / Could / Will you",
          "type": "request-offer",
          "label": "Câu hỏi Yêu cầu / Đề nghị",
          "tip": "Đáp lại bằng sự đồng ý (Sure, certainly, no problem) hoặc từ chối lịch sự kèm lý do."
        },
        "keywordsAndCollocations": [
          {
            "term": "monitor plugged",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có thể kiểm tra xem màn hình đó đã được cắm chưa không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yêu cầu / Đề nghị",
          "quickTip": "Nghe \"Can / Could / Will you\" ➔ Bật ngay trọng tâm Câu hỏi Yêu cầu / Đề nghị!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Do you want me to check them all?",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Do you want me to check them all?",
          "translation": "Bạn có muốn tôi kiểm tra tất cả không?",
          "connectedSpeechNotes": [
            {
              "segment": "Could you check",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "I didn't send them yet.",
            "translation": "Tôi chưa gửi chúng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "A longer power cord.",
            "translation": "Một dây nguồn dài hơn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30750,
        "questionNumber": 20,
        "audioUrl": "/api/tts?q=Is%20the%20new%20inventory%20process%20more%20efficient%3F",
        "questionText": "Is the new inventory process more efficient?",
        "questionTranslation": "Quy trình kiểm kê mới có hiệu quả hơn không?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "more efficient",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Quy trình kiểm kê mới có hiệu quả hơn không?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It only took me an hour.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "It only took me an hour.",
          "translation": "Tôi chỉ mất một giờ.",
          "connectedSpeechNotes": [
            {
              "segment": "Is the new",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Yes, she's new here.",
            "translation": "Vâng, cô ấy là người mới ở đây.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "I'll have the fish.",
            "translation": "Tôi sẽ gọi món cá.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30751,
        "questionNumber": 21,
        "audioUrl": "/api/tts?q=Would%20you%20like%20some%20ice%20cream%20or%20cake%20for%20dessert%3F",
        "questionText": "Would you like some ice cream or cake for dessert?",
        "questionTranslation": "Bạn có muốn một ít kem hay bánh ngọt để tráng miệng không?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "cake dessert",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có muốn một ít kem hay bánh ngọt để tráng miệng không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I'm trying to avoid sugar.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "I'm trying to avoid sugar.",
          "translation": "Tôi đang không muốn sử dụng đường lắm.",
          "connectedSpeechNotes": [
            {
              "segment": "Would you like",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Because I'm hungry.",
            "translation": "Vì tôi đói.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "Yes, I liked it.",
            "translation": "Vâng, tôi đã rất thích nó.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-01-q22-q26",
    "title": "Đề Thi Fulltest 01: Câu 22 – 26",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 01.",
    "testSource": "ETS TOEIC Đề 01",
    "difficulty": "Nâng cao (800+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 802,
    "questions": [
      {
        "id": 30752,
        "questionNumber": 22,
        "audioUrl": "/api/tts?q=Who's%20doing%20the%20product%20demonstration%20this%20afternoon%3F",
        "questionText": "Who's doing the product demonstration this afternoon?",
        "questionTranslation": "Ai sẽ thực hiện màn giới thiệu sản phẩm chiều nay?",
        "questionStem": {
          "text": "Who",
          "type": "wh-question",
          "label": "Câu hỏi Người (Who)",
          "tip": "Tìm tên người, chức danh (manager, assistant, director), phòng ban hoặc câu gián tiếp."
        },
        "keywordsAndCollocations": [
          {
            "term": "this afternoon",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Ai sẽ thực hiện màn giới thiệu sản phẩm chiều nay?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Người (Who)",
          "quickTip": "Nghe \"Who\" ➔ Bật ngay trọng tâm Câu hỏi Người (Who)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I'm leaving for New York at lunchtime.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "I'm leaving for New York at lunchtime.",
          "translation": "Tôi sẽ đi New York vào giờ ăn trưa.",
          "connectedSpeechNotes": [
            {
              "segment": "Who's doing the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "That bus station is closed, sorry.",
            "translation": "Trạm xe buýt đó đã đóng cửa, xin lỗi.",
            "trapType": "association",
            "trapNameVi": "Bẫy đồ vật / Lạc đề thay vì chỉ Người (Who)",
            "analysisVi": "Câu hỏi hỏi về con người (Who) nhưng phương án lại đưa ra đồ vật hoặc sự việc."
          },
          {
            "letter": "C",
            "text": "Let me show you a few more.",
            "translation": "Để tôi chỉ cho bạn một vài cái nữa.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30753,
        "questionNumber": 23,
        "audioUrl": "/api/tts?q=Your%20presentation's%20being%20reviewed%20at%20today's%20managers'%20meeting.",
        "questionText": "Your presentation's being reviewed at today's managers' meeting.",
        "questionTranslation": "Lời dịch câu hỏi",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "managers meeting",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Lời dịch câu hỏi",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I didn't have much time to complete it.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "I didn't have much time to complete it.",
          "translation": "",
          "connectedSpeechNotes": [
            {
              "segment": "Your presentation's being",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Next slide, please.",
            "translation": "",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "That movie had great reviews.",
            "translation": "",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30754,
        "questionNumber": 24,
        "audioUrl": "/api/tts?q=Don't%20you%20carry%20these%20shoes%20in%20red%3F",
        "questionText": "Don't you carry these shoes in red?",
        "questionTranslation": "Bạn không mang những đôi giày màu đỏ này sao?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "shoes red",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn không mang những đôi giày màu đỏ này sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "There’s a new shipment coming tomorrow.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "There’s a new shipment coming tomorrow.",
          "translation": "Có một chuyến hàng mới sẽ đến vào ngày mai.",
          "connectedSpeechNotes": [
            {
              "segment": "Don't you carry",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "I’ll lift from this end.",
            "translation": "Tôi sẽ nâng từ đầu này.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "I have time to read it now.",
            "translation": "Tôi có thời gian để đọc nó bây giờ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30755,
        "questionNumber": 25,
        "audioUrl": "/api/tts?q=Would%20you%20like%20to%20have%20lunch%20with%20the%20clients%3F",
        "questionText": "Would you like to have lunch with the clients?",
        "questionTranslation": "Bạn có muốn ăn trưa với khách hàng không?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "with clients",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có muốn ăn trưa với khách hàng không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Sure, we can go to the café downstairs.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Sure, we can go to the café downstairs.",
          "translation": "Chắc chắn rồi, chúng ta có thể đi đến quán cà phê ở tầng dưới.",
          "connectedSpeechNotes": [
            {
              "segment": "Would you like",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "About a three-hour flight.",
            "translation": "Khoảng ba giờ bay.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "The first stage of the project.",
            "translation": "Giai đoạn đầu tiên của dự án.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30756,
        "questionNumber": 26,
        "audioUrl": "/api/tts?q=How%20about%20hiring%20an%20event%20planner%20to%20organize%20the%20holiday%20party%3F",
        "questionText": "How about hiring an event planner to organize the holiday party?",
        "questionTranslation": "Bạn nghĩ việc thuê một nhà lên kế hoạch sự kiện để tổ chức bữa tiệc kỳ nghỉ thì sao?",
        "questionStem": {
          "text": "How",
          "type": "wh-question",
          "label": "Câu hỏi Phương thức (How)",
          "tip": "Tìm phương tiện (by bus, online) hoặc cách thức thực hiện."
        },
        "keywordsAndCollocations": [
          {
            "term": "holiday party",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn nghĩ việc thuê một nhà lên kế hoạch sự kiện để tổ chức bữa tiệc kỳ nghỉ thì sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Phương thức (How)",
          "quickTip": "Nghe \"How\" ➔ Bật ngay trọng tâm Câu hỏi Phương thức (How)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "There's not much money in the budget.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "There's not much money in the budget.",
          "translation": "Không có nhiều tiền trong ngân sách.",
          "connectedSpeechNotes": [
            {
              "segment": "How about hiring",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "I think it's on the lower shelf.",
            "translation": "Tôi nghĩ nó ở kệ thấp hơn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "Sure, I'd love to attend.",
            "translation": "Chắc chắn rồi, tôi rất muốn tham dự.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-01-q27-q31",
    "title": "Đề Thi Fulltest 01: Câu 27 – 31",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 01.",
    "testSource": "ETS TOEIC Đề 01",
    "difficulty": "Nâng cao (800+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 802,
    "questions": [
      {
        "id": 30757,
        "questionNumber": 27,
        "audioUrl": "/api/tts?q=Isn't%20that%20carmaker%20planning%20to%20start%20exporting%20electric%20cars%3F",
        "questionText": "Isn't that carmaker planning to start exporting electric cars?",
        "questionTranslation": "Không phải nhà sản xuất ô tô đó đang có kế hoạch bắt đầu xuất khẩu ô tô điện sao?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "electric cars",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Không phải nhà sản xuất ô tô đó đang có kế hoạch bắt đầu xuất khẩu ô tô điện sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, I’ve heard that's the plan.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Yes, I’ve heard that's the plan.",
          "translation": "Có, tôi nghe kế hoạch là vậy.",
          "connectedSpeechNotes": [
            {
              "segment": "Isn't that carmaker",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "A ticket to next year's car show.",
            "translation": "Một vé tham dự triển lãm xe hơi năm sau.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Congratulations on your promotion!",
            "translation": "Chúc mừng bạn đã thăng chức!",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30758,
        "questionNumber": 28,
        "audioUrl": "/api/tts?q=David%20trained%20the%20interns%20to%20use%20the%20company%20database%2C%20didn't%20he%3F",
        "questionText": "David trained the interns to use the company database, didn't he?",
        "questionTranslation": "David đã huấn luyện các sinh viên thực tập cách sử dụng cơ sở dữ liệu của công ty, phải không?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "database didnt",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "David đã huấn luyện các sinh viên thực tập cách sử dụng cơ sở dữ liệu của công ty, phải không?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Actually, it was Hillary.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Actually, it was Hillary.",
          "translation": "Thực ra, đó là Hillary.",
          "connectedSpeechNotes": [
            {
              "segment": "David trained the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "An internal audit.",
            "translation": "Một cuộc kiểm toán nội bộ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "He's good company.",
            "translation": "Anh ấy là một đồng nghiệp tốt.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (company)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"company\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      },
      {
        "id": 30759,
        "questionNumber": 29,
        "audioUrl": "/api/tts?q=Who's%20responsible%20for%20researching%20the%20housing%20market%20in%20India%3F",
        "questionText": "Who's responsible for researching the housing market in India?",
        "questionTranslation": "Ai chịu trách nhiệm nghiên cứu thị trường nhà ở ở Ấn Độ?",
        "questionStem": {
          "text": "Who",
          "type": "wh-question",
          "label": "Câu hỏi Người (Who)",
          "tip": "Tìm tên người, chức danh (manager, assistant, director), phòng ban hoặc câu gián tiếp."
        },
        "keywordsAndCollocations": [
          {
            "term": "market India",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Ai chịu trách nhiệm nghiên cứu thị trường nhà ở ở Ấn Độ?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Người (Who)",
          "quickTip": "Nghe \"Who\" ➔ Bật ngay trọng tâm Câu hỏi Người (Who)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "The senior director is heading up that team.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "The senior director is heading up that team.",
          "translation": "Giám đốc cấp cao đang chỉ đạo nhóm đó.",
          "connectedSpeechNotes": [
            {
              "segment": "Who's responsible for",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Every morning at ten o'clock.",
            "translation": "Mỗi buổi sáng lúc mười giờ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Yes, it's on Main Street.",
            "translation": "Có, nó trên đường Main Street.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          }
        ]
      },
      {
        "id": 30760,
        "questionNumber": 30,
        "audioUrl": "/api/tts?q=Have%20you%20arranged%20a%20ride%20to%20take%20us%20to%20the%20convention%20center%2C%20or%20should%20I%3F",
        "questionText": "Have you arranged a ride to take us to the convention center, or should I?",
        "questionTranslation": "Bạn sắp xếp một chuyến xe để đưa chúng ta đến trung tâm hội nghị, hay là tôi làm?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "center should",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn sắp xếp một chuyến xe để đưa chúng ta đến trung tâm hội nghị, hay là tôi làm?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I don't have the phone number for the taxi service.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "I don't have the phone number for the taxi service.",
          "translation": "Tôi không có số điện thoại của dịch vụ taxi.",
          "connectedSpeechNotes": [
            {
              "segment": "Have you arranged",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Unfortunately, there isn't an extra bag.",
            "translation": "Thật không may, không có túi phụ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "We've accepted credit cards before.",
            "translation": "Trước đây chúng tôi chấp nhận thẻ tín dụng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30761,
        "questionNumber": 31,
        "audioUrl": "/api/tts?q=These%20purchases%20should%20have%20been%20entered%20on%20your%20expense%20report.",
        "questionText": "These purchases should have been entered on your expense report.",
        "questionTranslation": "Những giao dịch mua bán này lẽ ra đã nên được nhập vào báo cáo chi phí của bạn.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "expense report",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Những giao dịch mua bán này lẽ ra đã nên được nhập vào báo cáo chi phí của bạn.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I thought I had until Friday to do that.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "I thought I had until Friday to do that.",
          "translation": "Tôi cứ nghĩ rằng tới thứ 6 tôi mới phải làm việc đó cơ.",
          "connectedSpeechNotes": [
            {
              "segment": "These purchases should",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "No thanks, I don't need anything from the store.",
            "translation": "Không, cảm ơn, tôi không cần bất cứ thứ gì từ cửa hàng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "The entrance is on Thirty-First Street.",
            "translation": "Lối vào nằm trên đường 31.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-02-q7-q11",
    "title": "Đề Thi Fulltest 02: Câu 7 – 11",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 02.",
    "testSource": "ETS TOEIC Đề 02",
    "difficulty": "Cơ bản (500+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 803,
    "questions": [
      {
        "id": 30762,
        "questionNumber": 7,
        "audioUrl": "/api/tts?q=Who%20should%20write%20the%20press%20release%3F",
        "questionText": "Who should write the press release?",
        "questionTranslation": "Ai nên viết thông cáo báo chí?",
        "questionStem": {
          "text": "Who",
          "type": "wh-question",
          "label": "Câu hỏi Người (Who)",
          "tip": "Tìm tên người, chức danh (manager, assistant, director), phòng ban hoặc câu gián tiếp."
        },
        "keywordsAndCollocations": [
          {
            "term": "press release",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Ai nên viết thông cáo báo chí?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Người (Who)",
          "quickTip": "Nghe \"Who\" ➔ Bật ngay trọng tâm Câu hỏi Người (Who)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "George can take care of that.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "George can take care of that.",
          "translation": "George có thể lo điều đó.",
          "connectedSpeechNotes": [
            {
              "segment": "Who should write",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Press the red button.",
            "translation": "Nhấn nút màu đỏ.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (press)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"press\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "At the corner newsstand.",
            "translation": "Ở góc sạp báo.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30763,
        "questionNumber": 8,
        "audioUrl": "/api/tts?q=Where%20is%20the%20company's%20headquarters%3F",
        "questionText": "Where is the company's headquarters?",
        "questionTranslation": "Trụ sở chính của công ty ở đâu?",
        "questionStem": {
          "text": "Where is / Where are",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Tìm giới từ chỉ nơi chốn (at, in, on, next to...) hoặc vị trí. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "companys headquarters",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Trụ sở chính của công ty ở đâu?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Nơi chốn (Where)",
          "quickTip": "Nghe \"Where is / Where are\" ➔ Bật ngay trọng tâm Câu hỏi Nơi chốn (Where)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "In Berlin, Germany.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "In Berlin, Germany.",
          "translation": "Ở Berlin, Đức.",
          "connectedSpeechNotes": [
            {
              "segment": "Where is the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Before we went to work.",
            "translation": "Trước khi chúng tôi đi làm.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "His name is Mr. Lee.",
            "translation": "Anh ấy tên là Lee.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30764,
        "questionNumber": 9,
        "audioUrl": "/api/tts?q=Why%20are%20you%20visiting%20the%20clients%20tomorrow%3F",
        "questionText": "Why are you visiting the clients tomorrow?",
        "questionTranslation": "Tại sao bạn đến thăm khách hàng vào ngày mai?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "clients tomorrow",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tại sao bạn đến thăm khách hàng vào ngày mai?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I need to renew their contract.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "I need to renew their contract.",
          "translation": "Tôi cần gia hạn hợp đồng của họ.",
          "connectedSpeechNotes": [
            {
              "segment": "Why are you",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "After two o'clock.",
            "translation": "Sau hai giờ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "The Dubai airport.",
            "translation": "Sân bay Dubai.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30765,
        "questionNumber": 10,
        "audioUrl": "/api/tts?q=Does%20Dr.%20Allen%20work%20at%20the%20hospital%20or%20at%20a%20private%20practice%3F",
        "questionText": "Does Dr. Allen work at the hospital or at a private practice?",
        "questionTranslation": "Bác sĩ Allen làm việc tại bệnh viện hay tại một phòng khám tư nhân?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "private practice",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bác sĩ Allen làm việc tại bệnh viện hay tại một phòng khám tư nhân?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "At the hospital, I think.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "At the hospital, I think.",
          "translation": "Tại bệnh viện, tôi nghĩ vậy.",
          "connectedSpeechNotes": [
            {
              "segment": "Does Dr. Allen",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "We’ll need to practice that.",
            "translation": "Chúng ta sẽ cần phải thực hành điều đó.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (practice)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"practice\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "An annual exam.",
            "translation": "Một cuộc kiểm tra hàng năm.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30766,
        "questionNumber": 11,
        "audioUrl": "/api/tts?q=What's%20the%20best%20way%20for%20us%20to%20get%20to%20the%20conference%20center%3F",
        "questionText": "What's the best way for us to get to the conference center?",
        "questionTranslation": "Cách tốt nhất để chúng ta đến trung tâm hội nghị là gì?",
        "questionStem": {
          "text": "What",
          "type": "wh-question",
          "label": "Câu hỏi Thông tin (What)",
          "tip": "Bắt danh từ trọng tâm hoặc thông tin được yêu cầu."
        },
        "keywordsAndCollocations": [
          {
            "term": "conference center",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Cách tốt nhất để chúng ta đến trung tâm hội nghị là gì?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thông tin (What)",
          "quickTip": "Nghe \"What\" ➔ Bật ngay trọng tâm Câu hỏi Thông tin (What)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Let’s take a look at the train schedule.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Let’s take a look at the train schedule.",
          "translation": "Hãy xem lịch trình tàu hỏa.",
          "connectedSpeechNotes": [
            {
              "segment": "What's the best",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "I haven't heard from her, either.",
            "translation": "Tôi cũng chưa nghe tin tức từ cô ấy.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "It was a great presentation.",
            "translation": "Đó là một bài thuyết trình tuyệt vời.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-02-q12-q16",
    "title": "Đề Thi Fulltest 02: Câu 12 – 16",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 02.",
    "testSource": "ETS TOEIC Đề 02",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 803,
    "questions": [
      {
        "id": 30767,
        "questionNumber": 12,
        "audioUrl": "/api/tts?q=When%20will%20the%20forklift%20be%20repaired%3F",
        "questionText": "When will the forklift be repaired?",
        "questionTranslation": "Khi nào xe nâng sẽ được sửa chữa?",
        "questionStem": {
          "text": "When",
          "type": "wh-question",
          "label": "Câu hỏi Thời gian (When)",
          "tip": "Tìm mốc thời gian (giờ, ngày, tháng, liên từ until/after/before). Tuyệt đối tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "forklift repaired",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Khi nào xe nâng sẽ được sửa chữa?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thời gian (When)",
          "quickTip": "Nghe \"When\" ➔ Bật ngay trọng tâm Câu hỏi Thời gian (When)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Probably next week.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Probably next week.",
          "translation": "Có thể là vào tuần tới,",
          "connectedSpeechNotes": [
            {
              "segment": "When will the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "A fork and a knife, please.",
            "translation": "Làm ơn cho một cái nĩa và một con dao.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Several pairs.",
            "translation": "Một số cặp.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30768,
        "questionNumber": 13,
        "audioUrl": "/api/tts?q=Would%20you%20like%20me%20to%20send%20you%20an%20appointment%20reminder%3F",
        "questionText": "Would you like me to send you an appointment reminder?",
        "questionTranslation": "Bạn có muốn tôi gửi lời nhắc cuộc hẹn cho bạn không?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "appointment reminder",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có muốn tôi gửi lời nhắc cuộc hẹn cho bạn không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, I’d appreciate that.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Yes, I’d appreciate that.",
          "translation": "Vâng, tôi rất biết ơn nếu anh làm vậy.",
          "connectedSpeechNotes": [
            {
              "segment": "Would you like",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "The apartment downstairs.",
            "translation": "Căn hộ ở tầng dưới.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Do you accept credit cards?",
            "translation": "Bạn có chấp nhận thẻ tín dụng không?",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30769,
        "questionNumber": 14,
        "audioUrl": "/api/tts?q=Did%20you%20remember%20to%20book%20a%20photographer%20for%20today's%20museum%20opening%3F",
        "questionText": "Did you remember to book a photographer for today's museum opening?",
        "questionTranslation": "Bạn có nhớ lên lịch với một nhiếp ảnh gia cho buổi khai trương bảo tàng hôm nay không?",
        "questionStem": {
          "text": "Yes/No Question",
          "type": "yes-no",
          "label": "Câu hỏi Yes/No",
          "tip": "Có thể trả lời trực tiếp bằng Yes/No hoặc trả lời gián tiếp bằng tình huống thực tế."
        },
        "keywordsAndCollocations": [
          {
            "term": "museum opening",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có nhớ lên lịch với một nhiếp ảnh gia cho buổi khai trương bảo tàng hôm nay không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yes/No",
          "quickTip": "Nghe \"Yes/No Question\" ➔ Bật ngay trọng tâm Câu hỏi Yes/No!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "She should have been here by now.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "She should have been here by now.",
          "translation": "Cô ấy đáng lẽ ra nên ở đây ngay bây giờ rồi ý.",
          "connectedSpeechNotes": [
            {
              "segment": "Did you remember",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Oh, have you read it too?",
            "translation": "Ồ, bạn cũng đã đọc nó chứ?",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "I'd like to have it framed.",
            "translation": "Tôi muốn đóng khung nó.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30770,
        "questionNumber": 15,
        "audioUrl": "/api/tts?q=Why%20is%20my%20computer%20so%20slow%20today%3F",
        "questionText": "Why is my computer so slow today?",
        "questionTranslation": "Tại sao máy tính của tôi hôm nay quá chậm?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "slow today",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tại sao máy tính của tôi hôm nay quá chậm?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Because some updates are being installed.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Because some updates are being installed.",
          "translation": "Bởi vì một số bản cập nhật đang được cài đặt.",
          "connectedSpeechNotes": [
            {
              "segment": "Why is my",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "The printer is down that hall.",
            "translation": "Máy in ở dưới sảnh đó.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Next year's computer seminar.",
            "translation": "Hội thảo máy tính năm tới.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (computer)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"computer\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      },
      {
        "id": 30771,
        "questionNumber": 16,
        "audioUrl": "/api/tts?q=Who's%20going%20to%20stock%20these%20shelves%3F",
        "questionText": "Who's going to stock these shelves?",
        "questionTranslation": "Ai sẽ mang bỏ kho những kệ hàng này?",
        "questionStem": {
          "text": "Who",
          "type": "wh-question",
          "label": "Câu hỏi Người (Who)",
          "tip": "Tìm tên người, chức danh (manager, assistant, director), phòng ban hoặc câu gián tiếp."
        },
        "keywordsAndCollocations": [
          {
            "term": "these shelves",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Ai sẽ mang bỏ kho những kệ hàng này?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Người (Who)",
          "quickTip": "Nghe \"Who\" ➔ Bật ngay trọng tâm Câu hỏi Người (Who)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "The overnight workers will do it.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "The overnight workers will do it.",
          "translation": "Các công nhân làm việc qua đêm sẽ làm việc đó.",
          "connectedSpeechNotes": [
            {
              "segment": "Who's going to",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "No, I haven't gone yet.",
            "translation": "Không, tôi vẫn chưa đi.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          },
          {
            "letter": "C",
            "text": "To make room for more items.",
            "translation": "Để nhường chỗ cho nhiều mặt hàng hơn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-02-q17-q21",
    "title": "Đề Thi Fulltest 02: Câu 17 – 21",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 02.",
    "testSource": "ETS TOEIC Đề 02",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 803,
    "questions": [
      {
        "id": 30772,
        "questionNumber": 17,
        "audioUrl": "/api/tts?q=How%20many%20bottles%20can%20these%20machines%20produce%20each%20hour%3F",
        "questionText": "How many bottles can these machines produce each hour?",
        "questionTranslation": "Máy này sản xuất được bao nhiêu chai mỗi giờ?",
        "questionStem": {
          "text": "How much / How many",
          "type": "wh-question",
          "label": "Câu hỏi Số lượng / Giá cả",
          "tip": "Tìm con số hoặc giá tiền ($50, ten copies)."
        },
        "keywordsAndCollocations": [
          {
            "term": "each hour",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Máy này sản xuất được bao nhiêu chai mỗi giờ?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Số lượng / Giá cả",
          "quickTip": "Nghe \"How much / How many\" ➔ Bật ngay trọng tâm Câu hỏi Số lượng / Giá cả!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I just started working here.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "I just started working here.",
          "translation": "Tôi vừa mới bắt đầu làm việc ở đây.",
          "connectedSpeechNotes": [
            {
              "segment": "How many bottles",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Mainly soft drinks and juices.",
            "translation": "Chủ yếu là nước ngọt và nước trái cây.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "It stays fresh for a long time.",
            "translation": "Nó vẫn tươi trong một thời gian dài.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30773,
        "questionNumber": 18,
        "audioUrl": "/api/tts?q=Aren't%20these%20hiking%20boots%20supposed%20to%20be%20discounted%3F",
        "questionText": "Aren't these hiking boots supposed to be discounted?",
        "questionTranslation": "Không phải những đôi ủng đi bộ kiểu này được giảm giá sao?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "supposed discounted",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Không phải những đôi ủng đi bộ kiểu này được giảm giá sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Oh yes, sorry about that.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Oh yes, sorry about that.",
          "translation": "Ồ vâng, xin lỗi về điều đó.",
          "connectedSpeechNotes": [
            {
              "segment": "Aren't these hiking",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Let's pose for a picture.",
            "translation": "Hãy tạo dáng chụp ảnh.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "No, we haven't met yet.",
            "translation": "Không, chúng tôi chưa gặp nhau.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30774,
        "questionNumber": 19,
        "audioUrl": "/api/tts?q=Do%20we%20have%20enough%20time%20to%20finish%20this%20report%3F",
        "questionText": "Do we have enough time to finish this report?",
        "questionTranslation": "Chúng ta có đủ thời gian để hoàn thành báo cáo này không?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "this report",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Chúng ta có đủ thời gian để hoàn thành báo cáo này không?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I'll reschedule my next appointment.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "I'll reschedule my next appointment.",
          "translation": "Tôi sẽ lên lịch lại cuộc hẹn tiếp theo của mình.",
          "connectedSpeechNotes": [
            {
              "segment": "Do we have",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "She borrowed your newspaper.",
            "translation": "Cô ấy đã mượn tờ báo của bạn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "It's a beautiful trail.",
            "translation": "Đó là một con đường mòn đẹp.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30775,
        "questionNumber": 20,
        "audioUrl": "/api/tts?q=When%20do%20you%20usually%20start%20packing%20for%20a%20trip%3F",
        "questionText": "When do you usually start packing for a trip?",
        "questionTranslation": "Khi nào bạn thường bắt đầu xếp hành lý cho một chuyến đi?",
        "questionStem": {
          "text": "When",
          "type": "wh-question",
          "label": "Câu hỏi Thời gian (When)",
          "tip": "Tìm mốc thời gian (giờ, ngày, tháng, liên từ until/after/before). Tuyệt đối tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "packing trip",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Khi nào bạn thường bắt đầu xếp hành lý cho một chuyến đi?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thời gian (When)",
          "quickTip": "Nghe \"When\" ➔ Bật ngay trọng tâm Câu hỏi Thời gian (When)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "About two days in advance.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "About two days in advance.",
          "translation": "Trước khoảng hai ngày.",
          "connectedSpeechNotes": [
            {
              "segment": "When do you",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "A round-trip ticket.",
            "translation": "Một vé khứ hồi.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "They delivered the package.",
            "translation": "Họ đã giao gói hàng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30776,
        "questionNumber": 21,
        "audioUrl": "/api/tts?q=I'm%20going%20to%20take%20a%20walk%20at%20lunchtime.",
        "questionText": "I'm going to take a walk at lunchtime.",
        "questionTranslation": "Tôi sẽ đi dạo vào giờ ăn trưa.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "walk lunchtime",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi sẽ đi dạo vào giờ ăn trưa.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Oh, I’ll be visiting clients then.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Oh, I’ll be visiting clients then.",
          "translation": "Ồ, lúc đó tôi sẽ đến thăm khách hàng.",
          "connectedSpeechNotes": [
            {
              "segment": "I'm going to",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "He took the survey.",
            "translation": "Anh ấy đã tham gia cuộc khảo sát.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "A copy of the lunch menu.",
            "translation": "Một bản sao của thực đơn bữa trưa.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-02-q22-q26",
    "title": "Đề Thi Fulltest 02: Câu 22 – 26",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 02.",
    "testSource": "ETS TOEIC Đề 02",
    "difficulty": "Nâng cao (800+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 803,
    "questions": [
      {
        "id": 30777,
        "questionNumber": 22,
        "audioUrl": "/api/tts?q=Can%20you%20make%20sure%20we%20have%20a%20sign-up%20sheet%20available%3F",
        "questionText": "Can you make sure we have a sign-up sheet available?",
        "questionTranslation": "Bạn có thể đảm bảo rằng chúng tôi có sẵn giấy đăng ký không?",
        "questionStem": {
          "text": "Can / Could / Will you",
          "type": "request-offer",
          "label": "Câu hỏi Yêu cầu / Đề nghị",
          "tip": "Đáp lại bằng sự đồng ý (Sure, certainly, no problem) hoặc từ chối lịch sự kèm lý do."
        },
        "keywordsAndCollocations": [
          {
            "term": "sheet available",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có thể đảm bảo rằng chúng tôi có sẵn giấy đăng ký không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yêu cầu / Đề nghị",
          "quickTip": "Nghe \"Can / Could / Will you\" ➔ Bật ngay trọng tâm Câu hỏi Yêu cầu / Đề nghị!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Sure, no problem.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Sure, no problem.",
          "translation": "Chắc chắn, không có vấn đề gì.",
          "connectedSpeechNotes": [
            {
              "segment": "Can you make",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "I just turned up the heat.",
            "translation": "Tôi vừa tăng nhiệt độ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "Sign here, please.",
            "translation": "Xin vui lòng ký vào đây.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30778,
        "questionNumber": 23,
        "audioUrl": "/api/tts?q=They're%20going%20to%20give%20each%20of%20us%20copies%20of%20the%20press%20release%2C%20aren't%20they%3F",
        "questionText": "They're going to give each of us copies of the press release, aren't they?",
        "questionTranslation": "Họ sẽ đưa cho mỗi người chúng ta bản sao của thông cáo báo chí, phải không?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "arent they",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Họ sẽ đưa cho mỗi người chúng ta bản sao của thông cáo báo chí, phải không?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I'd better remind them about that.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "I'd better remind them about that.",
          "translation": "Tốt hơn là tôi nên nhắc họ về điều đó.",
          "connectedSpeechNotes": [
            {
              "segment": "They're going to",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "No, I don't drink coffee.",
            "translation": "Không, tôi không uống cà phê.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "I can unlock that for you later.",
            "translation": "Tôi có thể mở khóa cho bạn sau.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30779,
        "questionNumber": 24,
        "audioUrl": "/api/tts?q=What%20do%20most%20people%20do%20for%20a%20living%20around%20here%3F",
        "questionText": "What do most people do for a living around here?",
        "questionTranslation": "Hầu hết mọi người quanh đây làm gì để kiếm sống?",
        "questionStem": {
          "text": "What",
          "type": "wh-question",
          "label": "Câu hỏi Thông tin (What)",
          "tip": "Bắt danh từ trọng tâm hoặc thông tin được yêu cầu."
        },
        "keywordsAndCollocations": [
          {
            "term": "around here",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Hầu hết mọi người quanh đây làm gì để kiếm sống?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thông tin (What)",
          "quickTip": "Nghe \"What\" ➔ Bật ngay trọng tâm Câu hỏi Thông tin (What)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "They work at the car manufacturing plant.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "They work at the car manufacturing plant.",
          "translation": "Họ làm việc tại nhà máy sản xuất xe hơi.",
          "connectedSpeechNotes": [
            {
              "segment": "What do most",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "About 40 kilometers away.",
            "translation": "Cách khoảng 40 km.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Yes, the living room furniture's new.",
            "translation": "Vâng, đồ nội thất phòng khách thì mới.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          }
        ]
      },
      {
        "id": 30780,
        "questionNumber": 25,
        "audioUrl": "/api/tts?q=How%20do%20you%20add%20toner%20to%20the%20printer%3F",
        "questionText": "How do you add toner to the printer?",
        "questionTranslation": "Làm cách nào để bạn thêm mực vào máy in?",
        "questionStem": {
          "text": "How",
          "type": "wh-question",
          "label": "Câu hỏi Phương thức (How)",
          "tip": "Tìm phương tiện (by bus, online) hoặc cách thức thực hiện."
        },
        "keywordsAndCollocations": [
          {
            "term": "toner printer",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Làm cách nào để bạn thêm mực vào máy in?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Phương thức (How)",
          "quickTip": "Nghe \"How\" ➔ Bật ngay trọng tâm Câu hỏi Phương thức (How)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "The instructions are on the box.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "The instructions are on the box.",
          "translation": "Những hướng dẫn có trên hộp.",
          "connectedSpeechNotes": [
            {
              "segment": "How do you",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "No, it's not made of stone.",
            "translation": "Không, nó không được làm bằng đá.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          },
          {
            "letter": "B",
            "text": "Because we ran out.",
            "translation": "Bởi vì chúng tôi đã hết.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30781,
        "questionNumber": 26,
        "audioUrl": "/api/tts?q=Can%20you%20send%20me%20a%20link%20to%20that%20company's%20Web%20site%3F",
        "questionText": "Can you send me a link to that company's Web site?",
        "questionTranslation": "Bạn có thể gửi cho tôi một liên kết đến trang web của công ty đó được không?",
        "questionStem": {
          "text": "Can / Could / Will you",
          "type": "request-offer",
          "label": "Câu hỏi Yêu cầu / Đề nghị",
          "tip": "Đáp lại bằng sự đồng ý (Sure, certainly, no problem) hoặc từ chối lịch sự kèm lý do."
        },
        "keywordsAndCollocations": [
          {
            "term": "companys site",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có thể gửi cho tôi một liên kết đến trang web của công ty đó được không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yêu cầu / Đề nghị",
          "quickTip": "Nghe \"Can / Could / Will you\" ➔ Bật ngay trọng tâm Câu hỏi Yêu cầu / Đề nghị!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Our e-mail's not working right now.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Our e-mail's not working right now.",
          "translation": "Email của chúng tôi hiện không hoạt động.",
          "connectedSpeechNotes": [
            {
              "segment": "Can you send",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Express delivery, please.",
            "translation": "Chuyển phát nhanh, làm ơn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Sure, I'll drive you to the job site.",
            "translation": "Chắc chắn rồi, tôi sẽ đưa bạn đến địa điểm làm việc.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (site)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"site\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-02-q27-q31",
    "title": "Đề Thi Fulltest 02: Câu 27 – 31",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 02.",
    "testSource": "ETS TOEIC Đề 02",
    "difficulty": "Nâng cao (800+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 803,
    "questions": [
      {
        "id": 30782,
        "questionNumber": 27,
        "audioUrl": "/api/tts?q=Isn't%20the%20air%20conditioner%20set%20to%20turn%20off%20at%20night%3F",
        "questionText": "Isn't the air conditioner set to turn off at night?",
        "questionTranslation": "Không phải tắt máy điều hòa không khí vào ban đêm sao?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "turn night",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Không phải tắt máy điều hòa không khí vào ban đêm sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "No, we always keep it on.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "No, we always keep it on.",
          "translation": "Không, chúng tôi luôn mở nó.",
          "connectedSpeechNotes": [
            {
              "segment": "Isn't the air",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "He's going to be late today.",
            "translation": "Hôm nay anh ấy sẽ đến muộn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Hair products are in aisle four.",
            "translation": "Các sản phẩm dành cho tóc ở lối đi số 4.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30783,
        "questionNumber": 28,
        "audioUrl": "/api/tts?q=Oh%2C%20there's%20no%20clock%20in%20this%20room.",
        "questionText": "Oh, there's no clock in this room.",
        "questionTranslation": "Ồ, không có đồng hồ trong phòng này.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "this room",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Ồ, không có đồng hồ trong phòng này.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It's about two-thirty,",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "It's about two-thirty,",
          "translation": "Khoảng hai giờ rưỡi,",
          "connectedSpeechNotes": [
            {
              "segment": "Oh, there's no",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "A six-week training program.",
            "translation": "Một chương trình đào tạo sáu tuần.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "They took an early flight.",
            "translation": "Họ lên một chuyến bay sớm.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30784,
        "questionNumber": 29,
        "audioUrl": "/api/tts?q=Where%20can%20I%20go%20to%20have%20my%20car%20engine%20checked%3F",
        "questionText": "Where can I go to have my car engine checked?",
        "questionTranslation": "Tôi có thể đến đâu để kiểm tra động cơ ô tô của mình?",
        "questionStem": {
          "text": "Where",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Tìm vị trí, phòng ban, địa chỉ, công viên. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "engine checked",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi có thể đến đâu để kiểm tra động cơ ô tô của mình?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Nơi chốn (Where)",
          "quickTip": "Nghe \"Where\" ➔ Bật ngay trọng tâm Câu hỏi Nơi chốn (Where)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "The mechanic around the corner.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "The mechanic around the corner.",
          "translation": "Thợ sửa xe ở quanh góc đường.",
          "connectedSpeechNotes": [
            {
              "segment": "Where can I",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "No, I don't need one - thanks, though.",
            "translation": "Không, tôi không cần một cái - mặc dù vậy, cảm ơn.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          },
          {
            "letter": "C",
            "text": "In April of every year.",
            "translation": "Vào tháng 4 hàng năm.",
            "trapType": "wrong_tense",
            "trapNameVi": "Bẫy nhầm Khi nào (When) thay vì Ở đâu (Where)",
            "analysisVi": "Phương án này trả lời cho câu hỏi về mốc thời gian, trong khi câu hỏi hỏi về địa điểm (Where)."
          }
        ]
      },
      {
        "id": 30785,
        "questionNumber": 30,
        "audioUrl": "/api/tts?q=To%20get%20into%20the%20building%2C%20do%20I%20use%20an%20ID%20badge%20or%20a%20passcode%3F",
        "questionText": "To get into the building, do I use an ID badge or a passcode?",
        "questionTranslation": "Để vào tòa nhà, tôi có phải sử dụng thẻ ID hay mật mã không?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "badge passcode",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Để vào tòa nhà, tôi có phải sử dụng thẻ ID hay mật mã không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Enter three-four-three on the keypad.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Enter three-four-three on the keypad.",
          "translation": "Nhập 3-4-3 trên bàn phím.",
          "connectedSpeechNotes": [
            {
              "segment": "To get into",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "A building next door.",
            "translation": "Một tòa nhà bên cạnh.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (building)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"building\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "The exit is down the hall.",
            "translation": "Lối ra là đi xuống hành lang.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30786,
        "questionNumber": 31,
        "audioUrl": "/api/tts?q=The%20order%20can%20still%20be%20changed%2C%20right%3F",
        "questionText": "The order can still be changed, right?",
        "questionTranslation": "Đơn đặt hàng vẫn có thể được thay đổi, phải không?",
        "questionStem": {
          "text": "Tag Question (...right?)",
          "type": "tag-question",
          "label": "Câu hỏi Đuôi / Xác nhận",
          "tip": "Tìm kiếm sự xác nhận thông tin. Thường trả lời bằng Yes/No hoặc đính chính thông tin."
        },
        "keywordsAndCollocations": [
          {
            "term": "changed right",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Đơn đặt hàng vẫn có thể được thay đổi, phải không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Đuôi / Xác nhận",
          "quickTip": "Nghe \"Tag Question (...right?)\" ➔ Bật ngay trọng tâm Câu hỏi Đuôi / Xác nhận!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "That process is very complicated.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "That process is very complicated.",
          "translation": "Quá trình đó rất phức tạp.",
          "connectedSpeechNotes": [
            {
              "segment": "The order can",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "I still remember that day, too.",
            "translation": "Tôi cũng vẫn nhớ ngày hôm đó.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (still)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"still\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "Yes, he does.",
            "translation": "Vâng, anh ấy có.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-03-q7-q11",
    "title": "Đề Thi Fulltest 03: Câu 7 – 11",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 03.",
    "testSource": "ETS TOEIC Đề 03",
    "difficulty": "Cơ bản (500+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 804,
    "questions": [
      {
        "id": 30787,
        "questionNumber": 7,
        "audioUrl": "/api/tts?q=Where%20is%20the%20closest%20coffee%20shop%3F",
        "questionText": "Where is the closest coffee shop?",
        "questionTranslation": "Quán cà phê gần nhất ở đâu?",
        "questionStem": {
          "text": "Where is / Where are",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Tìm giới từ chỉ nơi chốn (at, in, on, next to...) hoặc vị trí. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "coffee shop",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Quán cà phê gần nhất ở đâu?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Nơi chốn (Where)",
          "quickTip": "Nghe \"Where is / Where are\" ➔ Bật ngay trọng tâm Câu hỏi Nơi chốn (Where)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It's down the street.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "It's down the street.",
          "translation": "Nó ở dưới phố.",
          "connectedSpeechNotes": [
            {
              "segment": "Where is the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "From nine until five.",
            "translation": "Từ chín đến năm.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Just a few office supplies.",
            "translation": "Chỉ là một vài đồ dùng văn phòng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30788,
        "questionNumber": 8,
        "audioUrl": "/api/tts?q=Would%20you%20like%20a%20morning%20or%20an%20afternoon%20appointment%3F",
        "questionText": "Would you like a morning or an afternoon appointment?",
        "questionTranslation": "Bạn muốn một cuộc hẹn buổi sáng hay buổi chiều?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "afternoon appointment",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn muốn một cuộc hẹn buổi sáng hay buổi chiều?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "The afternoon, please.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "The afternoon, please.",
          "translation": "Buổi chiều nhé.",
          "connectedSpeechNotes": [
            {
              "segment": "Would you like",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "She was at her annual checkup.",
            "translation": "Cô ấy đã đi khám sức khỏe định kỳ hàng năm.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "I can bring in the paperwork.",
            "translation": "Tôi có thể mang theo giấy tờ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30789,
        "questionNumber": 9,
        "audioUrl": "/api/tts?q=Are%20you%20having%20trouble%20with%20your%20Internet%20connection%2C%20too%3F",
        "questionText": "Are you having trouble with your Internet connection, too?",
        "questionTranslation": "Bạn cũng gặp sự cố với kết nối Internet của mình?",
        "questionStem": {
          "text": "Yes/No Question",
          "type": "yes-no",
          "label": "Câu hỏi Yes/No",
          "tip": "Có thể trả lời trực tiếp bằng Yes/No hoặc trả lời gián tiếp bằng tình huống thực tế."
        },
        "keywordsAndCollocations": [
          {
            "term": "connection too",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn cũng gặp sự cố với kết nối Internet của mình?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yes/No",
          "quickTip": "Nghe \"Yes/No Question\" ➔ Bật ngay trọng tâm Câu hỏi Yes/No!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, S can’t access anything online.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Yes, S can’t access anything online.",
          "translation": "Có, tôi không thể truy cập bất cứ thứ gì trực tuyến.",
          "connectedSpeechNotes": [
            {
              "segment": "Are you having",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "He'll take a connecting flight to Paris.",
            "translation": "Anh ấy sẽ đáp chuyến bay nối chuyến đến Paris.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "We should double our order.",
            "translation": "Chúng ta nên tăng gấp đôi đơn hàng của mình.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30790,
        "questionNumber": 10,
        "audioUrl": "/api/tts?q=Who's%20that%20sitting%20in%20the%20lobby%3F",
        "questionText": "Who's that sitting in the lobby?",
        "questionTranslation": "Ai đang ngồi trong sảnh?",
        "questionStem": {
          "text": "Who",
          "type": "wh-question",
          "label": "Câu hỏi Người (Who)",
          "tip": "Tìm tên người, chức danh (manager, assistant, director), phòng ban hoặc câu gián tiếp."
        },
        "keywordsAndCollocations": [
          {
            "term": "sitting lobby",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Ai đang ngồi trong sảnh?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Người (Who)",
          "quickTip": "Nghe \"Who\" ➔ Bật ngay trọng tâm Câu hỏi Người (Who)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "That's the new summer intern.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "That's the new summer intern.",
          "translation": "Đó là thực tập sinh mùa hè mới.",
          "connectedSpeechNotes": [
            {
              "segment": "Who's that sitting",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "The armchair is comfortable.",
            "translation": "Ghế bành thật thoải mái.",
            "trapType": "association",
            "trapNameVi": "Bẫy đồ vật / Lạc đề thay vì chỉ Người (Who)",
            "analysisVi": "Câu hỏi hỏi về con người (Who) nhưng phương án lại đưa ra đồ vật hoặc sự việc."
          },
          {
            "letter": "C",
            "text": "My hobby's photography.",
            "translation": "Sở thích chụp ảnh của tôi.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30791,
        "questionNumber": 11,
        "audioUrl": "/api/tts?q=What%20did%20Simone%20say%20about%20the%20project%20proposal%3F",
        "questionText": "What did Simone say about the project proposal?",
        "questionTranslation": "Simone nói gì về đề xuất dự án?",
        "questionStem": {
          "text": "What",
          "type": "wh-question",
          "label": "Câu hỏi Thông tin (What)",
          "tip": "Bắt danh từ trọng tâm hoặc thông tin được yêu cầu."
        },
        "keywordsAndCollocations": [
          {
            "term": "project proposal",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Simone nói gì về đề xuất dự án?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thông tin (What)",
          "quickTip": "Nghe \"What\" ➔ Bật ngay trọng tâm Câu hỏi Thông tin (What)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "She said she liked it a lot.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "She said she liked it a lot.",
          "translation": "Cô ấy nói rằng cô ấy thích nó rất nhiều.",
          "connectedSpeechNotes": [
            {
              "segment": "What did Simone",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "The other projector's broken.",
            "translation": "Máy chiếu kia bị hỏng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Right, I heard about them.",
            "translation": "Đúng vậy, tôi đã nghe nói về chúng.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (about)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"about\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-03-q12-q16",
    "title": "Đề Thi Fulltest 03: Câu 12 – 16",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 03.",
    "testSource": "ETS TOEIC Đề 03",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 804,
    "questions": [
      {
        "id": 30792,
        "questionNumber": 12,
        "audioUrl": "/api/tts?q=Would%20you%20like%20a%20free%20ticket%20to%20tonight's%20play%3F",
        "questionText": "Would you like a free ticket to tonight's play?",
        "questionTranslation": "Bạn có muốn một vé miễn phí đến buổi chơi tối nay không?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "tonights play",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có muốn một vé miễn phí đến buổi chơi tối nay không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "No thanks, I have plans.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "No thanks, I have plans.",
          "translation": "Không, cảm ơn, tôi có kế hoạch.",
          "connectedSpeechNotes": [
            {
              "segment": "Would you like",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Which team won?",
            "translation": "Đội nào thắng?",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "A short intermission.",
            "translation": "Một khoảng thời gian tạm nghỉ ngắn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30793,
        "questionNumber": 13,
        "audioUrl": "/api/tts?q=Isn't%20that%20new%20restaurant%20supposed%20to%20open%20soon%3F",
        "questionText": "Isn't that new restaurant supposed to open soon?",
        "questionTranslation": "Không phải nhà hàng mới đó sẽ sớm mở sao?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "open soon",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Không phải nhà hàng mới đó sẽ sớm mở sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, in a few more weeks.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Yes, in a few more weeks.",
          "translation": "Có, trong vài tuần nữa.",
          "connectedSpeechNotes": [
            {
              "segment": "Isn't that new",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "No, I prefer Italian food.",
            "translation": "Không, tôi thích đồ ăn Ý hơn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "A great lunch menu.",
            "translation": "Một thực đơn bữa trưa tuyệt vời.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30794,
        "questionNumber": 14,
        "audioUrl": "/api/tts?q=Why%20is%20the%20flight%20delayed%3F",
        "questionText": "Why is the flight delayed?",
        "questionTranslation": "Tại sao chuyến bay bị hoãn?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "flight delayed",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tại sao chuyến bay bị hoãn?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Because we're waiting for a storm to pass.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Because we're waiting for a storm to pass.",
          "translation": "Bởi vì chúng ta đang chờ một cơn bão qua đi.",
          "connectedSpeechNotes": [
            {
              "segment": "Why is the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "The prices are all displayed.",
            "translation": "Tất cả giá đều được hiển thị.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Two hours and forty-five minutes.",
            "translation": "Hai tiếng bốn mươi lăm phút.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30795,
        "questionNumber": 15,
        "audioUrl": "/api/tts?q=Who's%20organizing%20the%20bowling%20league%3F",
        "questionText": "Who's organizing the bowling league?",
        "questionTranslation": "Ai là người tổ chức giải đấu bowling?",
        "questionStem": {
          "text": "Who",
          "type": "wh-question",
          "label": "Câu hỏi Người (Who)",
          "tip": "Tìm tên người, chức danh (manager, assistant, director), phòng ban hoặc câu gián tiếp."
        },
        "keywordsAndCollocations": [
          {
            "term": "bowling league",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Ai là người tổ chức giải đấu bowling?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Người (Who)",
          "quickTip": "Nghe \"Who\" ➔ Bật ngay trọng tâm Câu hỏi Người (Who)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It starts next spring.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "It starts next spring.",
          "translation": "Nó bắt đầu vào mùa xuân tới cơ.",
          "connectedSpeechNotes": [
            {
              "segment": "Who's organizing the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Stack the bowls on top of the plates.",
            "translation": "Xếp bát lên trên đĩa.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "By alphabetical order.",
            "translation": "Theo thứ tự bảng chữ cái.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30796,
        "questionNumber": 16,
        "audioUrl": "/api/tts?q=Did%20you%20submit%20the%20expense%20reports%3F",
        "questionText": "Did you submit the expense reports?",
        "questionTranslation": "Bạn đã gửi báo cáo chi phí chưa?",
        "questionStem": {
          "text": "Yes/No Question",
          "type": "yes-no",
          "label": "Câu hỏi Yes/No",
          "tip": "Có thể trả lời trực tiếp bằng Yes/No hoặc trả lời gián tiếp bằng tình huống thực tế."
        },
        "keywordsAndCollocations": [
          {
            "term": "expense reports",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn đã gửi báo cáo chi phí chưa?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yes/No",
          "quickTip": "Nghe \"Yes/No Question\" ➔ Bật ngay trọng tâm Câu hỏi Yes/No!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "There's a lot of data to review.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "There's a lot of data to review.",
          "translation": "Có rất nhiều dữ liệu cần xem xét.",
          "connectedSpeechNotes": [
            {
              "segment": "Did you submit",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "The team we saw last week.",
            "translation": "Nhóm chúng ta đã thấy tuần trước.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "That's not as expensive as we thought.",
            "translation": "Cái đó không đắt như chúng ta nghĩ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-03-q17-q21",
    "title": "Đề Thi Fulltest 03: Câu 17 – 21",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 03.",
    "testSource": "ETS TOEIC Đề 03",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 804,
    "questions": [
      {
        "id": 30797,
        "questionNumber": 17,
        "audioUrl": "/api/tts?q=Aren't%20we%20all%20getting%20new%20business%20cards%3F",
        "questionText": "Aren't we all getting new business cards?",
        "questionTranslation": "Không phải tất cả chúng ta đều nhận được danh thiếp mới sao?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "business cards",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Không phải tất cả chúng ta đều nhận được danh thiếp mới sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "No, you have to request them.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "No, you have to request them.",
          "translation": "Không, bạn phải yêu cầu chúng.",
          "connectedSpeechNotes": [
            {
              "segment": "Aren't we all",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "An upcoming conference.",
            "translation": "Một hội nghị sắp tới.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "I just bought a birthday card.",
            "translation": "Tôi vừa mua một tấm thiệp sinh nhật.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30798,
        "questionNumber": 18,
        "audioUrl": "/api/tts?q=How%20many%20people%20did%20you%20interview%3F",
        "questionText": "How many people did you interview?",
        "questionTranslation": "Bạn đã phỏng vấn bao nhiêu người?",
        "questionStem": {
          "text": "How much / How many",
          "type": "wh-question",
          "label": "Câu hỏi Số lượng / Giá cả",
          "tip": "Tìm con số hoặc giá tiền ($50, ten copies)."
        },
        "keywordsAndCollocations": [
          {
            "term": "people interview",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn đã phỏng vấn bao nhiêu người?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Số lượng / Giá cả",
          "quickTip": "Nghe \"How much / How many\" ➔ Bật ngay trọng tâm Câu hỏi Số lượng / Giá cả!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Three candidates.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Three candidates.",
          "translation": "Ba ứng cử viên.",
          "connectedSpeechNotes": [
            {
              "segment": "How many people",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "The company newsletter.",
            "translation": "Bản tin công ty.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "I've prepared some questions.",
            "translation": "Tôi đã chuẩn bị một số câu hỏi.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30799,
        "questionNumber": 19,
        "audioUrl": "/api/tts?q=Sales%20of%20our%20strawberry%20ice%20cream%20rose%20by%20ten%20percent%20last%20month.",
        "questionText": "Sales of our strawberry ice cream rose by ten percent last month.",
        "questionTranslation": "Doanh số bán kem dâu tây của chúng ta đã tăng 10% trong tháng trước.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "last month",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Doanh số bán kem dâu tây của chúng ta đã tăng 10% trong tháng trước.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I had no idea it was so popular.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "I had no idea it was so popular.",
          "translation": "Tôi không biết nó lại phổ biến như vậy.",
          "connectedSpeechNotes": [
            {
              "segment": "Sales of our",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Yes, it was very cold.",
            "translation": "Đúng, trời rất lạnh.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "Get the fruit from Fresh Fruits Farms.",
            "translation": "Lấy trái cây từ Trang trại Fresh Fruits.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30800,
        "questionNumber": 20,
        "audioUrl": "/api/tts?q=Can%20you%20help%20me%20log%20on%20to%20my%20computer%3F",
        "questionText": "Can you help me log on to my computer?",
        "questionTranslation": "Bạn có thể giúp tôi đăng nhập vào máy tính của mình được không?",
        "questionStem": {
          "text": "Can / Could / Will you",
          "type": "request-offer",
          "label": "Câu hỏi Yêu cầu / Đề nghị",
          "tip": "Đáp lại bằng sự đồng ý (Sure, certainly, no problem) hoặc từ chối lịch sự kèm lý do."
        },
        "keywordsAndCollocations": [
          {
            "term": "help computer",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có thể giúp tôi đăng nhập vào máy tính của mình được không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yêu cầu / Đề nghị",
          "quickTip": "Nghe \"Can / Could / Will you\" ➔ Bật ngay trọng tâm Câu hỏi Yêu cầu / Đề nghị!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Sorry, you'll need to call Technical Support.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Sorry, you'll need to call Technical Support.",
          "translation": "Xin lỗi, bạn cần gọi cho bộ phận Hỗ trợ kỹ thuật.",
          "connectedSpeechNotes": [
            {
              "segment": "Can you help",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "A password with both letters and numbers.",
            "translation": "Mật khẩu có cả chữ và số.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "That's a useful software program.",
            "translation": "Đó là một chương trình phần mềm hữu ích.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30801,
        "questionNumber": 21,
        "audioUrl": "/api/tts?q=What%20time%20do%20you%20think%20we'll%20leave%20the%20zoo%3F",
        "questionText": "What time do you think we'll leave the zoo?",
        "questionTranslation": "Bạn nghĩ chúng ta sẽ rời sở thú lúc mấy giờ?",
        "questionStem": {
          "text": "What time",
          "type": "wh-question",
          "label": "Câu hỏi Giờ giấc cụ thể",
          "tip": "Tìm mốc giờ cụ thể (at 6 o’clock, after 2 PM) hoặc giờ mở/đóng cửa."
        },
        "keywordsAndCollocations": [
          {
            "term": "leave zoo",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn nghĩ chúng ta sẽ rời sở thú lúc mấy giờ?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Giờ giấc cụ thể",
          "quickTip": "Nghe \"What time\" ➔ Bật ngay trọng tâm Câu hỏi Giờ giấc cụ thể!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Some of the exhibit lines are quite long.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Some of the exhibit lines are quite long.",
          "translation": "Một số hàng triển lãm khá dài.",
          "connectedSpeechNotes": [
            {
              "segment": "What time do",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Please go through the west gate.",
            "translation": "Vui lòng đi qua cổng phía tây.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "Fifteen dollars for adults.",
            "translation": "Mười lăm đô la cho người lớn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-03-q22-q26",
    "title": "Đề Thi Fulltest 03: Câu 22 – 26",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 03.",
    "testSource": "ETS TOEIC Đề 03",
    "difficulty": "Nâng cao (800+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 804,
    "questions": [
      {
        "id": 30802,
        "questionNumber": 22,
        "audioUrl": "/api/tts?q=The%20artist%20has%20signed%20the%20paintings%2C%20hasn't%20she%3F",
        "questionText": "The artist has signed the paintings, hasn't she?",
        "questionTranslation": "Họa sĩ đã ký tên vào các bức tranh, phải không?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "hasnt she",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Họa sĩ đã ký tên vào các bức tranh, phải không?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, she did.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Yes, she did.",
          "translation": "Vâng, cô ấy đã làm vậy.",
          "connectedSpeechNotes": [
            {
              "segment": "The artist has",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "The opening ceremony.",
            "translation": "Lễ khai mạc.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "On both walls, please.",
            "translation": "Trên cả hai bức tường, xin vui lòng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30803,
        "questionNumber": 23,
        "audioUrl": "/api/tts?q=How%20do%20you%20like%20traveling%20by%20train%3F",
        "questionText": "How do you like traveling by train?",
        "questionTranslation": "Bạn thích đi du lịch bằng tàu hỏa như thế nào?",
        "questionStem": {
          "text": "How",
          "type": "wh-question",
          "label": "Câu hỏi Phương thức (How)",
          "tip": "Tìm phương tiện (by bus, online) hoặc cách thức thực hiện."
        },
        "keywordsAndCollocations": [
          {
            "term": "traveling train",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn thích đi du lịch bằng tàu hỏa như thế nào?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Phương thức (How)",
          "quickTip": "Nghe \"How\" ➔ Bật ngay trọng tâm Câu hỏi Phương thức (How)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Well, you know I hate flying.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Well, you know I hate flying.",
          "translation": "Bạn biết tôi ghét bay mà.",
          "connectedSpeechNotes": [
            {
              "segment": "How do you",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "I'm looking for a fitness trainer.",
            "translation": "Tôi đang tìm một huấn luyện viên thể dục.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "A round-trip ticket to Busan.",
            "translation": "Một vé khứ hồi đến Busan.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30804,
        "questionNumber": 24,
        "audioUrl": "/api/tts?q=Would%20you%20take%20charge%20of%20planning%20Pablo's%20retirement%20party%3F",
        "questionText": "Would you take charge of planning Pablo's retirement party?",
        "questionTranslation": "Bạn có chịu trách nhiệm lên kế hoạch cho bữa tiệc nghỉ hưu của Pablo không?",
        "questionStem": {
          "text": "Can / Could / Will you",
          "type": "request-offer",
          "label": "Câu hỏi Yêu cầu / Đề nghị",
          "tip": "Đáp lại bằng sự đồng ý (Sure, certainly, no problem) hoặc từ chối lịch sự kèm lý do."
        },
        "keywordsAndCollocations": [
          {
            "term": "retirement party",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có chịu trách nhiệm lên kế hoạch cho bữa tiệc nghỉ hưu của Pablo không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yêu cầu / Đề nghị",
          "quickTip": "Nghe \"Can / Could / Will you\" ➔ Bật ngay trọng tâm Câu hỏi Yêu cầu / Đề nghị!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "What's the budget?",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "What's the budget?",
          "translation": "Ngân sách là bao nhiêu?",
          "connectedSpeechNotes": [
            {
              "segment": "Would you take",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Blue, red, and yellow.",
            "translation": "Xanh dương, đỏ và vàng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "Turn the volume up please.",
            "translation": "Vui lòng tăng âm lượng lên.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30805,
        "questionNumber": 25,
        "audioUrl": "/api/tts?q=You%20hired%20the%20new%20assistant%20director%2C%20didn't%20you%3F",
        "questionText": "You hired the new assistant director, didn't you?",
        "questionTranslation": "Bạn đã thuê trợ lý giám đốc mới, phải không?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "didnt you",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn đã thuê trợ lý giám đốc mới, phải không?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I haven't even met her yet…",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "I haven't even met her yet…",
          "translation": "Tôi thậm chí còn chưa gặp cô ấy…",
          "connectedSpeechNotes": [
            {
              "segment": "You hired the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "A wonderful new film.",
            "translation": "Một bộ phim mới tuyệt vời.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "They were running a bit late.",
            "translation": "Họ đã hoạt động hơi muộn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30806,
        "questionNumber": 26,
        "audioUrl": "/api/tts?q=Should%20we%20put%20the%20advertisement%20on%20the%20first%20page%20or%20the%20last%20page%3F",
        "questionText": "Should we put the advertisement on the first page or the last page?",
        "questionTranslation": "Chúng ta nên đặt quảng cáo ở trang đầu tiên hay trang cuối cùng?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "last page",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Chúng ta nên đặt quảng cáo ở trang đầu tiên hay trang cuối cùng?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "The first page, definitely.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "The first page, definitely.",
          "translation": "Chắc chắn là trang đầu tiên.",
          "connectedSpeechNotes": [
            {
              "segment": "Should we put",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "He bought a newspaper.",
            "translation": "Anh ấy đã mua một tờ báo.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Last year in August.",
            "translation": "Năm ngoái vào tháng Tám.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (last)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"last\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-03-q27-q31",
    "title": "Đề Thi Fulltest 03: Câu 27 – 31",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 03.",
    "testSource": "ETS TOEIC Đề 03",
    "difficulty": "Nâng cao (800+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 804,
    "questions": [
      {
        "id": 30807,
        "questionNumber": 27,
        "audioUrl": "/api/tts?q=I've%20finished%20the%20building%20inspection.",
        "questionText": "I've finished the building inspection.",
        "questionTranslation": "Tôi đã hoàn thành việc kiểm tra tòa nhà.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "building inspection",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi đã hoàn thành việc kiểm tra tòa nhà.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Did you find any problems?",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Did you find any problems?",
          "translation": "Bạn có tìm thấy bất kỳ vấn đề nào không?",
          "connectedSpeechNotes": [
            {
              "segment": "I've finished the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "To my work e-mail address.",
            "translation": "Tới địa chỉ e-mail cơ quan của tôi.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "On the seventh floor.",
            "translation": "Trên tầng bảy.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30808,
        "questionNumber": 28,
        "audioUrl": "/api/tts?q=When%20is%20Pierre%20scheduled%20to%20pick%20up%20the%20steel%20pipe%3F",
        "questionText": "When is Pierre scheduled to pick up the steel pipe?",
        "questionTranslation": "Khi nào thì Pierre đến lấy ống thép?",
        "questionStem": {
          "text": "When",
          "type": "wh-question",
          "label": "Câu hỏi Thời gian (When)",
          "tip": "Tìm mốc thời gian (giờ, ngày, tháng, liên từ until/after/before). Tuyệt đối tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "steel pipe",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Khi nào thì Pierre đến lấy ống thép?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thời gian (When)",
          "quickTip": "Nghe \"When\" ➔ Bật ngay trọng tâm Câu hỏi Thời gian (When)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Well, the truck is gone.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Well, the truck is gone.",
          "translation": "Chà, chiếc xe tải đã đi mất.",
          "connectedSpeechNotes": [
            {
              "segment": "When is Pierre",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "No, I'm sorry about that.",
            "translation": "Không, tôi xin lỗi về điều đó.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          },
          {
            "letter": "B",
            "text": "That should be interesting.",
            "translation": "Điều đó nên thú vị.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30809,
        "questionNumber": 29,
        "audioUrl": "/api/tts?q=Why%20am%20I%20not%20authorized%20to%20download%20this%20software%3F",
        "questionText": "Why am I not authorized to download this software?",
        "questionTranslation": "Tại sao tôi không được phép tải xuống phần mềm này?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "this software",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tại sao tôi không được phép tải xuống phần mềm này?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "You'd better check with your manager.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "You'd better check with your manager.",
          "translation": "Bạn nên kiểm tra với người quản lý của mình.",
          "connectedSpeechNotes": [
            {
              "segment": "Why am I",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Two million so far.",
            "translation": "Hai triệu cho đến nay.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Is he a famous author?",
            "translation": "Anh ấy có phải là một tác giả nổi tiếng không?",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30810,
        "questionNumber": 30,
        "audioUrl": "/api/tts?q=Where%20do%20you%20park%20when%20you%20drive%20to%20Dr.%20Li's%20office%3F",
        "questionText": "Where do you park when you drive to Dr. Li's office?",
        "questionTranslation": "Bạn đậu xe ở đâu khi lái xe đến văn phòng bác sĩ Li?",
        "questionStem": {
          "text": "Where",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Tìm vị trí, phòng ban, địa chỉ, công viên. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "Lis office",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn đậu xe ở đâu khi lái xe đến văn phòng bác sĩ Li?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Nơi chốn (Where)",
          "quickTip": "Nghe \"Where\" ➔ Bật ngay trọng tâm Câu hỏi Nơi chốn (Where)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It's more convenient to take the bus.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "It's more convenient to take the bus.",
          "translation": "Đi xe buýt thuận tiện hơn.",
          "connectedSpeechNotes": [
            {
              "segment": "Where do you",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "An annual medical checkup.",
            "translation": "Kiểm tra y tế hàng năm.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "She thought it was the best treatment.",
            "translation": "Cô ấy nghĩ đó là cách điều trị tốt nhất.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30811,
        "questionNumber": 31,
        "audioUrl": "/api/tts?q=Aren't%20we%20getting%20a%20digital%20sound%20system%3F",
        "questionText": "Aren't we getting a digital sound system?",
        "questionTranslation": "Chúng ta không có một hệ thống âm thanh kỹ thuật số sao?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "sound system",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Chúng ta không có một hệ thống âm thanh kỹ thuật số sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "You know how long the approval process takes.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "You know how long the approval process takes.",
          "translation": "Bạn biết quá trình phê duyệt mất bao lâu mà.",
          "connectedSpeechNotes": [
            {
              "segment": "Aren't we getting",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "She was recently promoted to manager!",
            "translation": "Cô ấy gần đây đã được thăng chức lên quản lý!",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Because the store closes early tonight.",
            "translation": "Bởi vì tối nay cửa hàng đóng cửa sớm.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-04-q7-q11",
    "title": "Đề Thi Fulltest 04: Câu 7 – 11",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 04.",
    "testSource": "ETS TOEIC Đề 04",
    "difficulty": "Cơ bản (500+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 807,
    "questions": [
      {
        "id": 30863,
        "questionNumber": 7,
        "audioUrl": "/api/tts?q=When%20are%20they%20delivering%20the%20manuals%3F",
        "questionText": "When are they delivering the manuals?",
        "questionTranslation": "Khi nào họ cung cấp sách hướng dẫn?",
        "questionStem": {
          "text": "When",
          "type": "wh-question",
          "label": "Câu hỏi Thời gian (When)",
          "tip": "Tìm mốc thời gian (giờ, ngày, tháng, liên từ until/after/before). Tuyệt đối tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "delivering manuals",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Khi nào họ cung cấp sách hướng dẫn?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thời gian (When)",
          "quickTip": "Nghe \"When\" ➔ Bật ngay trọng tâm Câu hỏi Thời gian (When)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "On Wednesday.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "On Wednesday.",
          "translation": "Vào Thứ Tư",
          "connectedSpeechNotes": [
            {
              "segment": "When are they",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Because they're busy.",
            "translation": "Bởi vì họ bận.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "The new cover design.",
            "translation": "Thiết kế bìa mới.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30864,
        "questionNumber": 8,
        "audioUrl": "/api/tts?q=How%20much%20does%20it%20cost%20to%20rent%20this%20retail%20space%3F",
        "questionText": "How much does it cost to rent this retail space?",
        "questionTranslation": "Giá thuê mặt bằng bán lẻ này là bao nhiêu?",
        "questionStem": {
          "text": "How much / How many",
          "type": "wh-question",
          "label": "Câu hỏi Số lượng / Giá cả",
          "tip": "Tìm con số hoặc giá tiền ($50, ten copies)."
        },
        "keywordsAndCollocations": [
          {
            "term": "retail space",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Giá thuê mặt bằng bán lẻ này là bao nhiêu?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Số lượng / Giá cả",
          "quickTip": "Nghe \"How much / How many\" ➔ Bật ngay trọng tâm Câu hỏi Số lượng / Giá cả!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "The fee is 200 dollars.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "The fee is 200 dollars.",
          "translation": "Lệ phí là 200 đô la.",
          "connectedSpeechNotes": [
            {
              "segment": "How much does",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "By living close to work.",
            "translation": "Bằng cách sống gần nơi làm việc.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "The desk measures five feet long.",
            "translation": "Cái bàn dài năm feet.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30865,
        "questionNumber": 9,
        "audioUrl": "/api/tts?q=Where%20is%20the%20store%20manager%3F",
        "questionText": "Where is the store manager?",
        "questionTranslation": "Quản lý cửa hàng đâu rồi?",
        "questionStem": {
          "text": "Where is / Where are",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Tìm giới từ chỉ nơi chốn (at, in, on, next to...) hoặc vị trí. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "store manager",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Quản lý cửa hàng đâu rồi?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Nơi chốn (Where)",
          "quickTip": "Nghe \"Where is / Where are\" ➔ Bật ngay trọng tâm Câu hỏi Nơi chốn (Where)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "She went out for lunch.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "She went out for lunch.",
          "translation": "Cô ấy đi ăn trưa.",
          "connectedSpeechNotes": [
            {
              "segment": "Where is the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Some items from the back room.",
            "translation": "Một số vật dụng từ phòng sau.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "No, I'm not a manager.",
            "translation": "Không, tôi không phải là người quản lý.",
            "trapType": "yes_no_wh",
            "trapNameVi": "Bẫy Yes/No cho câu hỏi Wh-",
            "analysisVi": "Câu hỏi bắt đầu bằng từ nghi vấn Wh- tuyệt đối không bao giờ trả lời bằng Yes/No trực tiếp."
          }
        ]
      },
      {
        "id": 30866,
        "questionNumber": 10,
        "audioUrl": "/api/tts?q=Should%20I%20turn%20off%20my%20computer%20or%20leave%20it%20on%3F",
        "questionText": "Should I turn off my computer or leave it on?",
        "questionTranslation": "Tôi nên tắt máy tính hay để nó hoạt động?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "computer leave",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi nên tắt máy tính hay để nó hoạt động?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Please turn it off.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Please turn it off.",
          "translation": "Hãy tắt nó đi.",
          "connectedSpeechNotes": [
            {
              "segment": "Should I turn",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "How did you sleep?",
            "translation": "Bạn đã ngủ như thế nào?",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "The yellow one.",
            "translation": "Cái màu vàng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30867,
        "questionNumber": 11,
        "audioUrl": "/api/tts?q=Who%20has%20attended%20a%20public%20speaking%20workshop%20before%3F",
        "questionText": "Who has attended a public speaking workshop before?",
        "questionTranslation": "Ai đã tham gia một hội thảo nói trước công chúng trước đây?",
        "questionStem": {
          "text": "Who",
          "type": "wh-question",
          "label": "Câu hỏi Người (Who)",
          "tip": "Tìm tên người, chức danh (manager, assistant, director), phòng ban hoặc câu gián tiếp."
        },
        "keywordsAndCollocations": [
          {
            "term": "workshop before",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Ai đã tham gia một hội thảo nói trước công chúng trước đây?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Người (Who)",
          "quickTip": "Nghe \"Who\" ➔ Bật ngay trọng tâm Câu hỏi Người (Who)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I think Julia has.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "I think Julia has.",
          "translation": "Tôi nghĩ là Julia.",
          "connectedSpeechNotes": [
            {
              "segment": "Who has attended",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Next Monday.",
            "translation": "Thứ Hai tới.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "A copy from the public library.",
            "translation": "Một bản sao từ thư viện công cộng",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (public)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"public\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-04-q12-q16",
    "title": "Đề Thi Fulltest 04: Câu 12 – 16",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 04.",
    "testSource": "ETS TOEIC Đề 04",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 807,
    "questions": [
      {
        "id": 30868,
        "questionNumber": 12,
        "audioUrl": "/api/tts?q=Why%20is%20Min-Soo%20selling%20his%20car%3F",
        "questionText": "Why is Min-Soo selling his car?",
        "questionTranslation": "Tại sao Min-Soo lại bán xe của mình?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "selling car",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tại sao Min-Soo lại bán xe của mình?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "He's buying a new one.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "He's buying a new one.",
          "translation": "Anh ấy sắp mua một cái mới.",
          "connectedSpeechNotes": [
            {
              "segment": "Why is Min-Soo",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Twenty years ago.",
            "translation": "20 năm trước.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "The next stop, please.",
            "translation": "Điểm dừng tiếp theo, xin cảm ơn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30869,
        "questionNumber": 13,
        "audioUrl": "/api/tts?q=When%20should%20we%20call%20the%20client%20in%20Beijing%3F",
        "questionText": "When should we call the client in Beijing?",
        "questionTranslation": "Khi nào chúng ta nên gọi cho khách hàng ở Bắc Kinh?",
        "questionStem": {
          "text": "When",
          "type": "wh-question",
          "label": "Câu hỏi Thời gian (When)",
          "tip": "Tìm mốc thời gian (giờ, ngày, tháng, liên từ until/after/before). Tuyệt đối tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "client Beijing",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Khi nào chúng ta nên gọi cho khách hàng ở Bắc Kinh?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Thời gian (When)",
          "quickTip": "Nghe \"When\" ➔ Bật ngay trọng tâm Câu hỏi Thời gian (When)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It's only five A.M. there now.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "It's only five A.M. there now.",
          "translation": "Ở đó mới 5 giờ sáng thôi.",
          "connectedSpeechNotes": [
            {
              "segment": "When should we",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "That's what I heard.",
            "translation": "Đó là những gì tôi đã nghe được.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "I usually take a direct flight.",
            "translation": "Tôi thường đáp chuyến bay thẳng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30870,
        "questionNumber": 14,
        "audioUrl": "/api/tts?q=Where%20should%20we%20set%20up%20the%20packaging%20machine%3F",
        "questionText": "Where should we set up the packaging machine?",
        "questionTranslation": "Chúng ta nên đặt máy gói hàng ở đâu?",
        "questionStem": {
          "text": "Where",
          "type": "wh-question",
          "label": "Câu hỏi Nơi chốn (Where)",
          "tip": "Tìm vị trí, phòng ban, địa chỉ, công viên. Không bao giờ chọn Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "packaging machine",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Chúng ta nên đặt máy gói hàng ở đâu?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Nơi chốn (Where)",
          "quickTip": "Nghe \"Where\" ➔ Bật ngay trọng tâm Câu hỏi Nơi chốn (Where)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "By the loading dock.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "By the loading dock.",
          "translation": "Cạnh bến tàu.",
          "connectedSpeechNotes": [
            {
              "segment": "Where should we",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "Many small parts.",
            "translation": "Nhiều bộ phận nhỏ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Overnight delivery.",
            "translation": "Giao hàng qua đêm",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30871,
        "questionNumber": 15,
        "audioUrl": "/api/tts?q=Who%20will%20we%20purchase%20costumes%20from%3F",
        "questionText": "Who will we purchase costumes from?",
        "questionTranslation": "Chúng ta sẽ mua trang phục từ ai?",
        "questionStem": {
          "text": "Who",
          "type": "wh-question",
          "label": "Câu hỏi Người (Who)",
          "tip": "Tìm tên người, chức danh (manager, assistant, director), phòng ban hoặc câu gián tiếp."
        },
        "keywordsAndCollocations": [
          {
            "term": "costumes from",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Chúng ta sẽ mua trang phục từ ai?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Người (Who)",
          "quickTip": "Nghe \"Who\" ➔ Bật ngay trọng tâm Câu hỏi Người (Who)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "It's cheaper to make them ourselves.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "It's cheaper to make them ourselves.",
          "translation": "Tự làm sẽ rẻ hơn.",
          "connectedSpeechNotes": [
            {
              "segment": "Who will we",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "In the rehearsal hall, I think.",
            "translation": "Trong hội trường diễn tập, tôi nghĩ vậy.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "I’m excited about the performance!",
            "translation": "Tôi rất vui mừng về màn trình diễn",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30872,
        "questionNumber": 16,
        "audioUrl": "/api/tts?q=Isn't%20the%20building%20inspector%20coming%20this%20afternoon%3F",
        "questionText": "Isn't the building inspector coming this afternoon?",
        "questionTranslation": "Chiều nay không phải thanh tra tòa nhà sẽ đến sao?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "this afternoon",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Chiều nay không phải thanh tra tòa nhà sẽ đến sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "No, he'll be here next week.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "No, he'll be here next week.",
          "translation": "Không, anh ấy sẽ đến đây vào tuần tới.",
          "connectedSpeechNotes": [
            {
              "segment": "Isn't the building",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "It's a beautiful building.",
            "translation": "Đó là một tòa nhà đẹp.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (building)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"building\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "Some updated safety regulations.",
            "translation": "Một số quy định an toàn được cập nhật",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-05-q7-q11",
    "title": "Đề Thi Fulltest 05: Câu 7 – 11",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 05.",
    "testSource": "ETS TOEIC Đề 05",
    "difficulty": "Cơ bản (500+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 809,
    "questions": [
      {
        "id": 30913,
        "questionNumber": 7,
        "audioUrl": "/api/tts?q=Would%20you%20like%20to%20meet%20the%20new%20clients%3F",
        "questionText": "Would you like to meet the new clients?",
        "questionTranslation": "Bạn có muốn gặp những khách hàng mới không?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "meet clients",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có muốn gặp những khách hàng mới không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Sure, I have some time right now.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Sure, I have some time right now.",
          "translation": "Chắc chắn rồi, tôi có chút thời gian ngay bây giờ",
          "connectedSpeechNotes": [
            {
              "segment": "Would you like",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "It was made of wood.",
            "translation": "Nó được làm bằng gỗ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "The new setup process.",
            "translation": "Quá trình thiết lập mới.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30914,
        "questionNumber": 8,
        "audioUrl": "/api/tts?q=Here's%20my%20presentation%20proposal.",
        "questionText": "Here's my presentation proposal.",
        "questionTranslation": "Đây là bản đề xuất thuyết trình của tôi.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "presentation proposal",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Đây là bản đề xuất thuyết trình của tôi.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Thanks, I'll look over it shortly.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Thanks, I'll look over it shortly.",
          "translation": "Cảm ơn, tôi sẽ xem qua nó trong thời gian ngắn.",
          "connectedSpeechNotes": [
            {
              "segment": "Here's my presentation",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "About an hour ago.",
            "translation": "Khoảng một giờ trước.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "Did you like your present?",
            "translation": "Bạn có thích món quà của mình không?",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30915,
        "questionNumber": 9,
        "audioUrl": "/api/tts?q=Do%20the%20city%20buses%20stop%20in%20the%20front%20or%20the%20back%20of%20the%20city%20hall%20building%3F",
        "questionText": "Do the city buses stop in the front or the back of the city hall building?",
        "questionTranslation": "Xe buýt thành phố dừng ở phía trước hay phía sau của tòa thị chính?",
        "questionStem": {
          "text": "Would you like ... (Or)",
          "type": "choice-or",
          "label": "Câu hỏi Mời / Lựa chọn (Or)",
          "tip": "Nếu có OR: Chọn 1 trong 2 hoặc Both/Neither. Nếu lời mời: Sure, I’d love to / No thanks."
        },
        "keywordsAndCollocations": [
          {
            "term": "hall building",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Xe buýt thành phố dừng ở phía trước hay phía sau của tòa thị chính?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Mời / Lựa chọn (Or)",
          "quickTip": "Nghe \"Would you like ... (Or)\" ➔ Bật ngay trọng tâm Câu hỏi Mời / Lựa chọn (Or)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "There's a stop in the front.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "There's a stop in the front.",
          "translation": "Có một trạm dừng ở phía trước.",
          "connectedSpeechNotes": [
            {
              "segment": "Do the city",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "A city council meeting.",
            "translation": "Một cuộc họp hội đồng thành phố.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (city)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"city\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "A monthly bus pass.",
            "translation": "Thẻ đi xe buýt hằng tháng",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30916,
        "questionNumber": 10,
        "audioUrl": "/api/tts?q=Why%20is%20the%20ceremony%20being%20moved%20indoors%3F",
        "questionText": "Why is the ceremony being moved indoors?",
        "questionTranslation": "Tại sao lễ kỷ niệm được chuyển vào trong nhà?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "moved indoors",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tại sao lễ kỷ niệm được chuyển vào trong nhà?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Because there's rain in the forecast.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "B",
          "text": "Because there's rain in the forecast.",
          "translation": "Vì dự báo có mưa.",
          "connectedSpeechNotes": [
            {
              "segment": "Why is the",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "It was nice seeing her there.",
            "translation": "Thật vui khi thấy cô ấy ở đó.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "I'll hold the door for you.",
            "translation": "Tôi sẽ giữ cửa cho bạn",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30917,
        "questionNumber": 11,
        "audioUrl": "/api/tts?q=I%20just%20love%20the%20taste%20of%20coffee%2C%20don't%20you%3F",
        "questionText": "I just love the taste of coffee, don't you?",
        "questionTranslation": "Tôi thích hương vị của cà phê, bạn thích không?",
        "questionStem": {
          "text": "Tag Question (...right?)",
          "type": "tag-question",
          "label": "Câu hỏi Đuôi / Xác nhận",
          "tip": "Tìm kiếm sự xác nhận thông tin. Thường trả lời bằng Yes/No hoặc đính chính thông tin."
        },
        "keywordsAndCollocations": [
          {
            "term": "dont you",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi thích hương vị của cà phê, bạn thích không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Đuôi / Xác nhận",
          "quickTip": "Nghe \"Tag Question (...right?)\" ➔ Bật ngay trọng tâm Câu hỏi Đuôi / Xác nhận!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I always drink tea.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "I always drink tea.",
          "translation": "Tôi luôn luôn uống trà",
          "connectedSpeechNotes": [
            {
              "segment": "I just love",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "About five minutes ago.",
            "translation": "Khoảng năm phút trước",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "A teaspoon of sugar.",
            "translation": "Một thìa cà phê đường.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  },
  {
    "id": "fulltest-05-q12-q16",
    "title": "Đề Thi Fulltest 05: Câu 12 – 16",
    "description": "Luyện phản xạ 5 câu Part 2 chọn lọc từ Bộ đề thi thật ETS TOEIC Đề 05.",
    "testSource": "ETS TOEIC Đề 05",
    "difficulty": "Trung cấp (650+)",
    "badgeColor": "bg-purple-500/10 text-purple-600 border-purple-500/20",
    "sourceType": "fulltest",
    "quizId": 809,
    "questions": [
      {
        "id": 30918,
        "questionNumber": 12,
        "audioUrl": "/api/tts?q=Are%20you%20interested%20in%20a%20freelance%20translation%20job%3F",
        "questionText": "Are you interested in a freelance translation job?",
        "questionTranslation": "Bạn có quan tâm đến một công việc dịch thuật tự do không?",
        "questionStem": {
          "text": "Yes/No Question",
          "type": "yes-no",
          "label": "Câu hỏi Yes/No",
          "tip": "Có thể trả lời trực tiếp bằng Yes/No hoặc trả lời gián tiếp bằng tình huống thực tế."
        },
        "keywordsAndCollocations": [
          {
            "term": "translation job",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có quan tâm đến một công việc dịch thuật tự do không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yes/No",
          "quickTip": "Nghe \"Yes/No Question\" ➔ Bật ngay trọng tâm Câu hỏi Yes/No!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "No, I'm too busy these days.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "No, I'm too busy these days.",
          "translation": "Không, dạo này tôi quá bận.",
          "connectedSpeechNotes": [
            {
              "segment": "Are you interested",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "An interest-free loan.",
            "translation": "Khoản vay không tính lãi.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "Please don't touch the walls.",
            "translation": "Xin đừng chạm vào tường.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30919,
        "questionNumber": 13,
        "audioUrl": "/api/tts?q=Could%20you%20send%20me%20this%20month's%20maintenance%20schedule%3F",
        "questionText": "Could you send me this month's maintenance schedule?",
        "questionTranslation": "Bạn có thể gửi cho tôi lịch bảo trì của tháng này được không?",
        "questionStem": {
          "text": "Can / Could / Will you",
          "type": "request-offer",
          "label": "Câu hỏi Yêu cầu / Đề nghị",
          "tip": "Đáp lại bằng sự đồng ý (Sure, certainly, no problem) hoặc từ chối lịch sự kèm lý do."
        },
        "keywordsAndCollocations": [
          {
            "term": "maintenance schedule",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Bạn có thể gửi cho tôi lịch bảo trì của tháng này được không?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Yêu cầu / Đề nghị",
          "quickTip": "Nghe \"Can / Could / Will you\" ➔ Bật ngay trọng tâm Câu hỏi Yêu cầu / Đề nghị!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "I'd be happy to.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "I'd be happy to.",
          "translation": "Tôi rất sẵn lòng.",
          "connectedSpeechNotes": [
            {
              "segment": "Could you send",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "No, he left in January.",
            "translation": "Không, anh ấy đã rời đi vào tháng Một",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "You should use the stairs.",
            "translation": "Bạn nên sử dụng cầu thang.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30920,
        "questionNumber": 14,
        "audioUrl": "/api/tts?q=Doesn't%20our%20firm%20reimburse%20travel%20expenses%3F",
        "questionText": "Doesn't our firm reimburse travel expenses?",
        "questionTranslation": "Công ty của chúng ta không hoàn trả chi phí đi lại sao?",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "travel expenses",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Công ty của chúng ta không hoàn trả chi phí đi lại sao?",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Yes, but only flight and hotel.",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Yes, but only flight and hotel.",
          "translation": "Có, nhưng chỉ có phí bay và khách sạn.",
          "connectedSpeechNotes": [
            {
              "segment": "Doesn't our firm",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "No, Friday doesn't work.",
            "translation": "Không, Thứ Sáu không hoạt động.",
            "trapType": "same_sound",
            "trapNameVi": "Bẫy lặp từ (doesnt)",
            "analysisVi": "Người ra đề cố tình lặp lại từ \"doesnt\" để đánh lừa thí sinh nghe loáng thoáng chọn bừa."
          },
          {
            "letter": "C",
            "text": "It's arriving at Gate 206.",
            "translation": "Nó đang giao đến Cổng 206",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30921,
        "questionNumber": 15,
        "audioUrl": "/api/tts?q=I%20need%20to%20stop%20at%20the%20pharmacy%20on%20my%20way%20to%20work.",
        "questionText": "I need to stop at the pharmacy on my way to work.",
        "questionTranslation": "Tôi cần dừng lại ở hiệu thuốc trên đường đi làm.",
        "questionStem": {
          "text": "Statement / Trần thuật",
          "type": "statement",
          "label": "Câu trần thuật (Statement)",
          "tip": "Bày tỏ quan điểm hoặc thông báo sự việc. Đáp án thường thể hiện sự đồng tình, giải pháp hoặc hỏi lại."
        },
        "keywordsAndCollocations": [
          {
            "term": "pharmacy work",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tôi cần dừng lại ở hiệu thuốc trên đường đi làm.",
          "questionIntent": "Xác định thông tin cho dạng Câu trần thuật (Statement)",
          "quickTip": "Nghe \"Statement / Trần thuật\" ➔ Bật ngay trọng tâm Câu trần thuật (Statement)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Oh, could you buy something for me?",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "C",
          "text": "Oh, could you buy something for me?",
          "translation": "Ồ, bạn có thể mua thứ gì đó cho tôi không?",
          "connectedSpeechNotes": [
            {
              "segment": "I need to",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "A",
            "text": "It's a large dairy farm.",
            "translation": "Đó là một trang trại bò sữa lớn.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "B",
            "text": "Her resume was very impressive.",
            "translation": "Sơ yếu lý lịch của cô ấy rất ấn tượng.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      },
      {
        "id": 30922,
        "questionNumber": 16,
        "audioUrl": "/api/tts?q=Why%20are%20we%20meeting%20to%20discuss%20the%20budget%3F",
        "questionText": "Why are we meeting to discuss the budget?",
        "questionTranslation": "Tại sao chúng ta lại họp bàn về ngân sách?",
        "questionStem": {
          "text": "Why",
          "type": "wh-question",
          "label": "Câu hỏi Lý do (Why)",
          "tip": "Tìm lý do (Because, Due to, To V...) hoặc lời giải thích tình huống. Tránh Yes/No!"
        },
        "keywordsAndCollocations": [
          {
            "term": "discuss budget",
            "phonetic": "/collocation/",
            "meaningVi": "Cụm từ trọng tâm câu hỏi"
          }
        ],
        "reflexDirection1": {
          "targetMeaningVi": "Tại sao chúng ta lại họp bàn về ngân sách?",
          "questionIntent": "Xác định thông tin cho dạng Câu hỏi Lý do (Why)",
          "quickTip": "Nghe \"Why\" ➔ Bật ngay trọng tâm Câu hỏi Lý do (Why)!"
        },
        "reflexDirection2": {
          "predictedDirectDirections": [
            "Have you seen last quarter's sales figures?",
            "I have no idea right now.",
            "Please ask the manager."
          ],
          "commonIndirectResponses": [
            {
              "vietnamesePrompt": "Tôi không rõ lắm",
              "englishResponse": "I'm not completely sure.",
              "explanation": "Dạng né tránh thông tin phổ biến trong TOEIC",
              "category": "khong_biet"
            },
            {
              "vietnamesePrompt": "Hỏi người phụ trách xem",
              "englishResponse": "Check with the department supervisor.",
              "explanation": "Dạng chuyển giao trách nhiệm",
              "category": "hoi_nguoi_khac"
            }
          ]
        },
        "correctChoice": {
          "letter": "A",
          "text": "Have you seen last quarter's sales figures?",
          "translation": "Bạn đã xem số liệu bán hàng của quý trước chưa?",
          "connectedSpeechNotes": [
            {
              "segment": "Why are we",
              "phoneticSpelling": "Connected speech",
              "type": "linking",
              "explanation": "Nối âm nhanh các từ đầu câu"
            }
          ]
        },
        "distractors": [
          {
            "letter": "B",
            "text": "Next Tuesday at two o'clock.",
            "translation": "Thứ Ba tuần tới vào lúc hai giờ.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          },
          {
            "letter": "C",
            "text": "I'd like to, but it's expensive.",
            "translation": "Tôi muốn, nhưng nó đắt quá.",
            "trapType": "irrelevant",
            "trapNameVi": "Bẫy lạc đề / Không liên quan ngữ cảnh",
            "analysisVi": "Nội dung phương án này hoàn toàn không trả lời đúng trọng tâm thông tin mà người hỏi đang tìm kiếm."
          }
        ]
      }
    ]
  }
];
