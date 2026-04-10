import { roomSyncService } from "../mock/roomSyncService";
import { SkyRoom } from "@/types/rooms";

describe("roomSyncService", () => {
  describe("subscribeRooms", () => {
    it("calls listener immediately with current rooms", () => {
      const listener = jest.fn();
      const unsub = roomSyncService.subscribeRooms(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(Array.isArray(listener.mock.calls[0][0])).toBe(true);
      unsub();
    });

    it("can unsubscribe", () => {
      const listener = jest.fn();
      const unsub = roomSyncService.subscribeRooms(listener);
      unsub();
      // After unsubscribe, creating a room shouldn't call the listener again
      const callCount = listener.mock.calls.length;
      roomSyncService.createRoom("Temp Room");
      // The listener should not be called again after unsubscribe
      // (other listeners may still exist from other tests)
      expect(listener.mock.calls.length).toBe(callCount);
    });
  });

  describe("subscribeGlobalChat", () => {
    it("calls listener immediately with current global chat", () => {
      const listener = jest.fn();
      const unsub = roomSyncService.subscribeGlobalChat(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(Array.isArray(listener.mock.calls[0][0])).toBe(true);
      unsub();
    });
  });

  describe("createRoom", () => {
    it("creates a room with correct structure", () => {
      const room = roomSyncService.createRoom("Test Room");
      expect(room).toHaveProperty("id");
      expect(room).toHaveProperty("roomCode");
      expect(room).toHaveProperty("name", "Test Room");
      expect(room).toHaveProperty("state");
      expect(room).toHaveProperty("chat");
      expect(room.roomCode).toMatch(/^SKY-[A-Z2-9]{6}$/);
      expect(room.state.participants).toContain("You");
      expect(room.chat.length).toBe(1);
    });

    it("notifies room listeners when a room is created", () => {
      const listener = jest.fn();
      const unsub = roomSyncService.subscribeRooms(listener);
      const callsBefore = listener.mock.calls.length;
      roomSyncService.createRoom("Listener Test Room");
      expect(listener.mock.calls.length).toBe(callsBefore + 1);
      unsub();
    });
  });

  describe("joinRoom", () => {
    it("returns null for nonexistent room code", () => {
      const result = roomSyncService.joinRoom("FAKE-999");
      expect(result).toBeNull();
    });

    it("joins an existing room", () => {
      const created = roomSyncService.createRoom("Joinable Room");
      const joined = roomSyncService.joinRoom(created.roomCode);
      expect(joined).not.toBeNull();
      expect(joined?.roomCode).toBe(created.roomCode);
    });

    it("is case-insensitive for room codes", () => {
      const created = roomSyncService.createRoom("Case Test");
      const joined = roomSyncService.joinRoom(created.roomCode.toLowerCase());
      expect(joined).not.toBeNull();
    });
  });

  describe("toggleHighlight", () => {
    it("adds and removes highlights", () => {
      const room = roomSyncService.createRoom("Highlight Test");
      let latestRooms: SkyRoom[] = [];
      const unsub = roomSyncService.subscribeRooms((rooms) => { latestRooms = rooms; });

      // Add highlight
      roomSyncService.toggleHighlight(room.id, "jupiter");
      const updatedRoom1 = latestRooms.find((r) => r.id === room.id)!;
      expect(updatedRoom1.state.highlightedObjectIds).toContain("jupiter");

      // Remove highlight
      roomSyncService.toggleHighlight(room.id, "jupiter");
      const updatedRoom2 = latestRooms.find((r) => r.id === room.id)!;
      expect(updatedRoom2.state.highlightedObjectIds).not.toContain("jupiter");

      unsub();
    });
  });

  describe("addNote", () => {
    it("adds a note to a room", () => {
      const room = roomSyncService.createRoom("Note Test");
      let latestRooms: SkyRoom[] = [];
      const unsub = roomSyncService.subscribeRooms((rooms) => { latestRooms = rooms; });

      roomSyncService.addNote(room.id, {
        id: "test-note",
        objectId: "jupiter",
        author: "Tester",
        text: "Great view!",
      });

      const updated = latestRooms.find((r) => r.id === room.id)!;
      expect(updated.state.notes.length).toBeGreaterThan(0);
      expect(updated.state.notes[0].text).toBe("Great view!");

      unsub();
    });
  });

  describe("addCustomConstellation", () => {
    it("adds a custom constellation to a room", () => {
      const room = roomSyncService.createRoom("Constellation Test");
      let latestRooms: SkyRoom[] = [];
      const unsub = roomSyncService.subscribeRooms((rooms) => { latestRooms = rooms; });

      roomSyncService.addCustomConstellation(room.id, {
        id: "custom-test",
        title: "My Pattern",
        starIds: ["sirius", "betelgeuse"],
        color: "#ff0000",
      });

      const updated = latestRooms.find((r) => r.id === room.id)!;
      expect(updated.state.customConstellations.length).toBeGreaterThan(0);
      expect(updated.state.customConstellations[0].title).toBe("My Pattern");

      unsub();
    });
  });

  describe("sendRoomMessage", () => {
    it("adds a message to room chat", () => {
      const room = roomSyncService.createRoom("Chat Test");
      let latestRooms: SkyRoom[] = [];
      const unsub = roomSyncService.subscribeRooms((rooms) => { latestRooms = rooms; });

      const now = Date.now();
      roomSyncService.sendRoomMessage(room.id, {
        id: "msg-test",
        author: "Tester",
        text: "Hello room!",
        timestampLabel: "Just now",
        timestamp: now,
      });

      const updated = latestRooms.find((r) => r.id === room.id)!;
      expect(updated.chat.length).toBe(2); // welcome msg + new msg
      expect(updated.chat[1].text).toBe("Hello room!");
      expect(updated.chat[1].timestamp).toBe(now);

      unsub();
    });
  });

  describe("sendGlobalMessage", () => {
    it("adds a message to global chat", () => {
      let latestChat: any[] = [];
      const unsub = roomSyncService.subscribeGlobalChat((msgs) => { latestChat = msgs; });
      const countBefore = latestChat.length;

      const now = Date.now();
      roomSyncService.sendGlobalMessage({
        id: "global-test",
        author: "Tester",
        text: "Hello world!",
        timestampLabel: "Just now",
        timestamp: now,
      });

      expect(latestChat.length).toBe(countBefore + 1);
      expect(latestChat[latestChat.length - 1].text).toBe("Hello world!");

      unsub();
    });
  });

  describe("updateSkyState", () => {
    it("updates room sky state", () => {
      const room = roomSyncService.createRoom("State Test");
      let latestRooms: SkyRoom[] = [];
      const unsub = roomSyncService.subscribeRooms((rooms) => { latestRooms = rooms; });

      roomSyncService.updateSkyState(room.id, { rotation: 180, zoom: 2.0 });

      const updated = latestRooms.find((r) => r.id === room.id)!;
      expect(updated.state.rotation).toBe(180);
      expect(updated.state.zoom).toBe(2.0);

      unsub();
    });
  });
});
