import { TopicPrompt } from "@/types/speaking";

export const SPEAKING_PROMPTS: Record<string, TopicPrompt[]> = {
  "IELTS Speaking": [
    {
      id: "ielts-1",
      topic: "IELTS Speaking",
      question: "Describe a memorable journey you have taken. Where did you go and who was with you?",
      followUps: [
        "Why was this trip so unforgettable?",
        "Do you prefer travelling alone or with friends/family?",
        "How has travel changed people's mindset in recent years?"
      ],
      vocabularyTips: ["breathtaking scenery", "itinerary", "broaden one's horizons", "off the beaten track"]
    },
    {
      id: "ielts-2",
      topic: "IELTS Speaking",
      question: "Do you think artificial intelligence will replace human jobs in the near future?",
      followUps: [
        "Which industries are most vulnerable?",
        "What skills should students develop to stay relevant?",
        "Can AI truly replicate human creativity and empathy?"
      ],
      vocabularyTips: ["automation", "breakthrough", "paradigm shift", "emotional intelligence"]
    }
  ],
  "TOEIC Speaking": [
    {
      id: "toeic-1",
      topic: "TOEIC Speaking",
      question: "Describe your ideal workplace environment. What makes a company a great place to work?",
      followUps: [
        "Do you prefer working remotely or in an office?",
        "How important is work-life balance compared to a high salary?",
        "How do you deal with tight deadlines and workplace stress?"
      ],
      vocabularyTips: ["collaborative atmosphere", "flexible hours", "career advancement", "productivity"]
    },
    {
      id: "toeic-2",
      topic: "TOEIC Speaking",
      question: "How do you handle customer complaints or misunderstandings in a professional setting?",
      followUps: [
        "Can you share an experience where good communication solved a problem?",
        "What steps should a manager take to resolve workplace conflict?"
      ],
      vocabularyTips: ["empathetic listening", "conflict resolution", "clarification", "win-win solution"]
    }
  ],
  "Daily Conversation": [
    {
      id: "daily-1",
      topic: "Daily Conversation",
      question: "What is your morning routine? How does starting your day right affect your mood?",
      followUps: [
        "Are you an early bird or a night owl?",
        "What is one habit you wish you could adopt or break?",
        "How do you unwind after a hectic day?"
      ],
      vocabularyTips: ["early bird", "night owl", "unwind", "kickstart the day"]
    },
    {
      id: "daily-2",
      topic: "Daily Conversation",
      question: "If you had a completely free weekend with zero obligations, what would you do?",
      followUps: [
        "Do you prefer outdoor adventures or staying cozy at home?",
        "Who would you invite to spend that weekend with you?"
      ],
      vocabularyTips: ["recharge my batteries", "spontaneous", "quality time", "binge-watch"]
    }
  ],
  "Travel": [
    {
      id: "travel-1",
      topic: "Travel",
      question: "What is your dream travel destination and why is it at the top of your bucket list?",
      followUps: [
        "What kind of local food would you want to try there?",
        "Do you like planning every hour of a trip or exploring spontaneously?"
      ],
      vocabularyTips: ["bucket list", "wanderlust", "cultural immersion", "local delicacies"]
    }
  ],
  "Technology": [
    {
      id: "tech-1",
      topic: "Technology",
      question: "What piece of modern technology could you never live without?",
      followUps: [
        "How does screen time impact your daily focus and sleep?",
        "Do you think smartphones bring people closer or isolate us?"
      ],
      vocabularyTips: ["indispensable", "digital detox", "distraction", "seamless connectivity"]
    }
  ],
  "Food": [
    {
      id: "food-1",
      topic: "Food",
      question: "What is your comfort food? Can you describe how it tastes and smells?",
      followUps: [
        "Do you enjoy cooking at home or eating out at restaurants?",
        "What is the most unusual food you have ever tasted?"
      ],
      vocabularyTips: ["comfort food", "savory", "mouth-watering", "culinary delight"]
    }
  ]
};

export const DEFAULT_PROMPTS: TopicPrompt[] = [
  {
    id: "default-1",
    topic: "Ice Breaker",
    question: "Hello everyone! Introduce yourself: What's your name, where are you from, and what is your goal in practicing English today?",
    followUps: [
      "How long have you been learning English?",
      "What is the hardest part of speaking English for you: pronunciation, vocabulary, or confidence?",
      "What's one thing you are really excited about this week?"
    ],
    vocabularyTips: ["native speaker", "confidence booster", "fluent", "articulate"]
  },
  {
    id: "default-2",
    topic: "Discussion",
    question: "What do you think is the best way to become fluent in English quickly?",
    followUps: [
      "Watching movies with English subtitles, reading books, or speaking with real people?",
      "How do you overcome the fear of making grammar mistakes when talking?"
    ],
    vocabularyTips: ["immersion", "muscle memory", "trial and error", "spontaneous response"]
  }
];

export function getPromptsForTopics(topics: string[]): TopicPrompt[] {
  const result: TopicPrompt[] = [];
  topics.forEach((t) => {
    if (SPEAKING_PROMPTS[t]) {
      result.push(...SPEAKING_PROMPTS[t]);
    }
  });
  if (result.length === 0) {
    return DEFAULT_PROMPTS;
  }
  return [...result, ...DEFAULT_PROMPTS];
}
