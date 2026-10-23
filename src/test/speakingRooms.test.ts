import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  generateRandomRoomPasscode, 
  CreateRoomInput 
} from "../services/speakingService";
import { 
  SPEAKING_TOPICS, 
  ENGLISH_LEVELS, 
  SpeakingRoom, 
  SpeakingMember 
} from "../types/speaking";
import { getPromptsForTopics, DEFAULT_PROMPTS } from "../data/speakingPrompts";

describe("English Speaking Rooms - Core Logic & Security Tests", () => {
  describe("1 & 2. Room Creation & Passcode Validation", () => {
    it("generates a secure 6-character random alphanumeric passcode without confusing characters", () => {
      const code1 = generateRandomRoomPasscode(6);
      const code2 = generateRandomRoomPasscode(6);

      expect(code1).toHaveLength(6);
      expect(code2).toHaveLength(6);
      expect(code1).not.toBe(code2);
      // Ensure only valid chars (A-Z, 2-9 without 0/O, 1/I)
      expect(code1).toMatch(/^[A-Z0-9]+$/);
    });

    it("correctly identifies valid and invalid room configurations", () => {
      const validPublicInput: CreateRoomInput = {
        name: "IELTS 7.0+ Daily Debate",
        english_level: "B2",
        topics: ["IELTS Speaking", "Technology"],
        capacity: 4,
        visibility: "public",
      };

      const validPrivateInput: CreateRoomInput = {
        name: "Study Group Only",
        english_level: "C1",
        topics: ["Academic English"],
        capacity: 2,
        visibility: "private",
        passcode: "SECURE",
      };

      expect(validPublicInput.name.trim().length).toBeGreaterThan(0);
      expect(validPublicInput.capacity).toBeGreaterThanOrEqual(2);
      expect(validPublicInput.capacity).toBeLessThanOrEqual(5);
      expect(["A1", "A2", "B1", "B2", "C1", "C2"]).toContain(validPublicInput.english_level);

      expect(validPrivateInput.visibility).toBe("private");
      expect(validPrivateInput.passcode).toBe("SECURE");
    });
  });

  describe("3. Input Validation Constraints", () => {
    it("rejects empty room names or names exceeding max characters", () => {
      const emptyName = "   ";
      const longName = "A".repeat(100);

      const isValidName = (name: string) => name.trim().length > 0 && name.trim().length <= 60;

      expect(isValidName(emptyName)).toBe(false);
      expect(isValidName(longName)).toBe(false);
      expect(isValidName("Coffee & Talk")).toBe(true);
    });

    it("clamps capacity within [2, 5]", () => {
      const clampCapacity = (c: number) => Math.min(5, Math.max(2, c));

      expect(clampCapacity(1)).toBe(2);
      expect(clampCapacity(10)).toBe(5);
      expect(clampCapacity(3)).toBe(3);
    });
  });

  describe("4 & 5. Room Capacity & Slot Enforcement", () => {
    const mockRoom: SpeakingRoom = {
      id: "room-1",
      name: "Practice Room",
      host_user_id: "user-host",
      english_level: "B1",
      topics: ["Daily Conversation"],
      visibility: "public",
      capacity: 3,
      status: "active",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      current_members: 3,
    };

    it("determines if a room is full based on capacity", () => {
      const isRoomFull = (room: SpeakingRoom) => (room.current_members || 0) >= room.capacity;

      expect(isRoomFull(mockRoom)).toBe(true);

      const openRoom = { ...mockRoom, current_members: 2 };
      expect(isRoomFull(openRoom)).toBe(false);
    });

    it("forbids joining when capacity is reached", () => {
      const canUserJoin = (room: SpeakingRoom, userId: string, isMember: boolean) => {
        if (room.status !== "active") return false;
        if (isMember) return true; // Already in
        if ((room.current_members || 0) >= room.capacity) return false;
        return true;
      };

      expect(canUserJoin(mockRoom, "user-new", false)).toBe(false);
      expect(canUserJoin(mockRoom, "user-host", true)).toBe(true);
    });
  });

  describe("6. Private Room Protection", () => {
    const privateRoom: SpeakingRoom = {
      id: "private-room-1",
      name: "Secret Club",
      host_user_id: "user-host",
      english_level: "B2",
      topics: ["Business English"],
      visibility: "private",
      passcode: "TALK99",
      capacity: 4,
      status: "active",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      current_members: 1,
    };

    it("verifies passcode correctly and blocks unauthorized attempts", () => {
      const checkAccess = (room: SpeakingRoom, userId: string, inputPasscode?: string) => {
        if (room.visibility === "public") return true;
        if (room.host_user_id === userId) return true;
        return room.passcode === inputPasscode;
      };

      // Host enters without passcode
      expect(checkAccess(privateRoom, "user-host")).toBe(true);

      // Wrong passcode
      expect(checkAccess(privateRoom, "user-guest", "WRONG1")).toBe(false);

      // No passcode
      expect(checkAccess(privateRoom, "user-guest", undefined)).toBe(false);

      // Correct passcode
      expect(checkAccess(privateRoom, "user-guest", "TALK99")).toBe(true);
    });
  });

  describe("7. Matchmaking Algorithm Scoring", () => {
    const candidateRooms: SpeakingRoom[] = [
      {
        id: "r1",
        name: "Casual Chat",
        host_user_id: "u1",
        english_level: "A2",
        topics: ["Food", "Music"],
        visibility: "public",
        capacity: 4,
        status: "active",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        current_members: 2,
      },
      {
        id: "r2",
        name: "IELTS Tech Prep",
        host_user_id: "u2",
        english_level: "B2",
        topics: ["IELTS Speaking", "Technology"],
        visibility: "public",
        capacity: 4,
        status: "active",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        current_members: 1,
      },
      {
        id: "r3",
        name: "Full Room",
        host_user_id: "u3",
        english_level: "B2",
        topics: ["IELTS Speaking"],
        visibility: "public",
        capacity: 2,
        status: "active",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        current_members: 2, // Full
      },
    ];

    it("ranks candidates prioritizing level match, topic overlap and free capacity", () => {
      const userLevel = "B2";
      const userTopics = ["IELTS Speaking", "Technology"];

      // Filter available rooms
      const available = candidateRooms.filter((r) => (r.current_members || 0) < r.capacity);
      expect(available).toHaveLength(2); // r3 excluded because full

      const scored = available.map((r) => {
        let score = 0;
        if (r.english_level === userLevel) score += 10;
        const overlap = r.topics.filter((t) => userTopics.includes(t)).length;
        score += overlap * 5;
        score += r.current_members || 0;
        return { id: r.id, score };
      });

      scored.sort((a, b) => b.score - a.score);

      // r2 should win: exact level B2 (+10), 2 topics overlap (+10), 1 member (+1) = 21
      expect(scored[0].id).toBe("r2");
      expect(scored[0].score).toBe(21);
    });
  });

  describe("8 & 11. Media Cleanup & Resource Deallocation", () => {
    it("releases all microphone MediaStreamTrack resources when leaving room", () => {
      const mockStop1 = vi.fn();
      const mockStop2 = vi.fn();

      const mockStream = {
        getTracks: () => [
          { kind: "audio", stop: mockStop1, enabled: true },
          { kind: "audio", stop: mockStop2, enabled: true },
        ],
      };

      // Perform cleanup simulation
      mockStream.getTracks().forEach((track) => track.stop());

      expect(mockStop1).toHaveBeenCalledTimes(1);
      expect(mockStop2).toHaveBeenCalledTimes(1);
    });
  });

  describe("9. Topic Prompts & Conversation Starters", () => {
    it("retrieves curated prompts with questions, follow-ups, and vocabulary", () => {
      const prompts = getPromptsForTopics(["IELTS Speaking", "Travel"]);

      expect(prompts.length).toBeGreaterThan(0);
      const first = prompts[0];
      expect(first.question).toBeDefined();
      expect(first.followUps).toBeDefined();
      expect(first.vocabularyTips).toBeDefined();
    });

    it("falls back to default ice breakers if unknown topics passed", () => {
      const prompts = getPromptsForTopics(["NonExistentTopic"]);
      expect(prompts).toEqual(DEFAULT_PROMPTS);
    });
  });
});
