import { create } from "zustand";
import { getSocket } from "../services/chat.service";
import axios from "axios";
import axiosInstance from "../services/url.service";

export const useChatStore = create((set, get) => ({
  conversations: [], //list of all conversations
  currentConversation: null, //current conversation being viewed
  messages: [], //messages in the current conversation
  loading: false, //loading state for messages
  error: null, //error state for messages
  onlineUsers: new Map(), //map of online users with their socket ids
  typingUsers: new Map(), //map of users who are typing in the current conversation

  //socket event listners setup
  initializeSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    //remove existing listeners to avoid duplicates
    socket.off("receive_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_send");
    socket.off("message_error");
    socket.off("message_deleted");

    //listen for incoming messages
    socket.on("receive_message", (message) => {
      const { receiveMessage } = get();
      receiveMessage(message);
    });

    //confirm message delivery
    socket.on("message_send", (message) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === message._id ? { ...message } : msg
        ),
      }));
    });

    //update message status
    socket.on("message_status_update", ({ messageId, messageStatus }) => {
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === messageId ? { ...msg, messageStatus } : msg
        ),
      }));
    });

    //handle react to message
    socket.on("reaction_updated", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((msg) => {
          return msg._id === messageId ? { ...msg, reactions } : msg;
        }),
      }));
    });

    //handle remove message from local state
    socket.on("message_deleted", ({ deletedMessageId }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== deletedMessageId),
      }));
    });

    //handle any message sending error
    socket.on("message_error", (error) => {
      console.error("Message error:", error);
    });

    //listen to typing users
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);
        if (!newTypingUsers.has(conversationId)) {
          newTypingUsers.set(conversationId, new Set());
        }
        const typingSet = newTypingUsers.get(conversationId);
        if (isTyping) {
          typingSet.add(userId);
        } else {
          typingSet.delete(userId);
        }
        return { typingUsers: newTypingUsers };
      });
    });

    //track users online/offline status

    socket.on("user_status", ({ userId, isOnline, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(userId, {
          isOnline,
          lastSeen,
        });
        return { onlineUsers: newOnlineUsers };
      });
    });

    //emit status check for all users in conversation list

    const { conversations } = get();
    if (conversations?.data?.length > 0) {
      conversations.data?.forEach((conv) => {
        const otherUser = conv.participants.find(
          (p) => p._id !== get().currentUser?._id
        );

        if (otherUser?._id) {
          socket.emit("get_user_status", otherUser._id, (status) => {
            set((state) => {
              const newOnlineUsers = new Map(state.onlineUsers);
              newOnlineUsers.set(otherUser._id, {
                isOnline: status.isOnline,
                lastSeen: status.lastSeen,
              });
              return { onlineUsers: newOnlineUsers };
            });
          });
        }
      });
    }
  },

  setCurrentUser: (user) => {
    set({ currentUser: user });
  },

  fetchConversations: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get(`/chat/conversations`);

      // Debug logging for unread counts
      console.log(
        "🔍 Raw conversations from backend:",
        data.data?.map((conv) => ({
          id: conv._id,
          participants: conv.participants?.map((p) => p._id),
          unreadCount: conv.unreadCount,
          lastMessage: conv.lastMessage
            ? {
                id: conv.lastMessage._id,
                content: conv.lastMessage.content,
                sender: conv.lastMessage.sender,
                receiver: conv.lastMessage.receiver,
                messageStatus: conv.lastMessage.messageStatus,
              }
            : null,
        }))
      );

      set({ conversations: data, loading: false });
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
      return null;
    }
  },

  //fetch messages for a conversation
  fetchMessages: async (conversationId) => {
    if (!conversationId) {
      return null;
    }
    try {
      const { data } = await axiosInstance.get(
        `/chat/conversations/${conversationId}/messages`
      );
      const messageArray = data.data || data || [];
      set({
        messages: messageArray,
        currentConversation: conversationId,
        loading: false,
      });

      // Only mark messages as read if there are unread messages where current user is the receiver
      const { currentUser } = get();
      const hasUnreadMessagesForCurrentUser = messageArray.some(
        (msg) =>
          msg.messageStatus !== "read" && msg.receiver?._id === currentUser?._id
      );

      if (hasUnreadMessagesForCurrentUser) {
        const { markMessagesAsRead } = get();
        markMessagesAsRead();
      }

      return messageArray;
    } catch (error) {
      set({
        error: error?.response?.data?.message || error?.message,
        loading: false,
      });
    }
  },

  //send message in real time
  sendMessage: async (formData) => {
    const senderId = formData.get("senderId");
    const receiverId = formData.get("receiverId");
    const media = formData.get("media");
    const content = formData.get("content");
    const messageStatus = formData.get("messageStatus");

    const socket = getSocket();
    const { conversations } = get();
    let conversationId = null;
    if (conversations?.data?.length > 0) {
      const conversation = conversations.data.find(
        (conv) =>
          conv.participants.some((p) => p._id === senderId) &&
          conv.participants.some((p) => p._id === receiverId)
      );
      if (conversation) {
        conversationId = conversation._id;
        set({ currentConversation: conversationId });
      }
    }

    //temp message before actual response
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      sender: { _id: senderId },
      receiver: { _id: receiverId },
      content,
      imageOrVideoUrl:
        media && typeof media !== "string" ? URL.createObjectURL(media) : null,
      conversation: conversationId,
      contentType: media
        ? media.type.startsWith("image/")
          ? "image"
          : "video"
        : "text",
      createdAt: new Date(),
      messageStatus,
    };

    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    try {
      const { data } = await axiosInstance.post(
        `/chat/send-message`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const messageData = data.data || data;

      // Emit the message through socket
      const socket = getSocket();
      if (socket) {
        socket.emit("send_message", messageData);
      }

      //replace optimistic message with actual response
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? messageData : msg
        ),
      }));
    } catch (error) {
      console.error("Error sending message:", error);
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? { ...msg, messageStatus: "failed" } : msg
        ),
      }));
      set({ error: error?.response?.data?.message || error?.message });
      throw error;
    }
  },

  receiveMessage: (message) => {
    if (!message) return;
    const { currentConversation, currentUser, messages } = get();

    const messageExists = messages.some((msg) => msg._id === message._id);
    if (messageExists) return;

    if (message.conversation === currentConversation) {
      set((state) => ({
        messages: [...state.messages, message],
      }));

      // If we're looking at the conversation right now, mark as read immediately
      if (message.receiver?._id === currentUser?._id) {
        // We're in the active conversation, so mark as read right away
        setTimeout(() => {
          get().markMessagesAsRead();
        }, 500); // Small delay to ensure UI updates properly
      }
    }

    set((state) => {
      const updateConversations = state.conversations?.data?.map((conv) => {
        if (conv._id === message.conversation) {
          return {
            ...conv,
            lastMessage: message,
            // Don't modify unreadCount here - let the backend refresh handle it
          };
        }
        return conv;
      });
      return {
        conversations: { ...state.conversations, data: updateConversations },
      };
    });

    // Always refresh conversations from server to get correct unread counts
    // Small delay to ensure backend has processed the message
    setTimeout(() => {
      get().fetchConversations();
    }, 500);
  },

  //mark as read
  markMessagesAsRead: async () => {
    const { messages, currentUser } = get();

    if (!messages.length || !currentUser) return;
    const unreadIds = messages
      .filter(
        (msg) =>
          msg.messageStatus !== "read" && msg.receiver?._id === currentUser._id
      )
      .map((msg) => msg._id)
      .filter(Boolean);

    console.log("📖 Marking messages as read:", {
      totalMessages: messages.length,
      unreadIds: unreadIds,
      currentUserId: currentUser._id,
      unreadMessages: messages
        .filter(
          (msg) =>
            msg.messageStatus !== "read" &&
            msg.receiver?._id === currentUser._id
        )
        .map((msg) => ({
          id: msg._id,
          content: msg.content,
          sender: msg.sender?._id,
          receiver: msg.receiver?._id,
          status: msg.messageStatus,
        })),
    });

    if (unreadIds.length === 0) return;

    try {
      await axiosInstance.put(`/chat/messages/read`, {
        messageIds: unreadIds,
      });
      set((state) => ({
        messages: state.messages.map((msg) =>
          unreadIds.includes(msg._id) ? { ...msg, messageStatus: "read" } : msg
        ),
      }));

      const socket = getSocket();
      socket.emit("message_read", unreadIds, messages[0]?.sender?._id);

      console.log("✅ Successfully marked messages as read:", unreadIds);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chat/messages/${messageId}`);
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
      return true;
    } catch (error) {
      console.error("Error deleting message:", error);
      set({ error: error.response?.data?.message || error.message });
      return false;
    }
  },

  //add/change reaction
  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();
    if (socket && currentUser) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        userId: currentUser?._id,
        reactionUserId: currentUser?._id,
      });
    }
  },

  startTyping: (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation && receiverId) {
      socket.emit("typing_start", {
        conversationId: currentConversation,
        receiverId,
      });
    }
  },

  stopTyping: (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation && receiverId) {
      socket.emit("typing_stop", {
        conversationId: currentConversation,
        receiverId,
      });
    }
  },

  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();
    if (
      !currentConversation ||
      !typingUsers.has(currentConversation) ||
      !userId
    ) {
      return false;
    }
    return typingUsers.get(currentConversation).has(userId);
  },

  isUserOnline: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.isOnline || false;
  },

  getUserLastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.lastSeen || null;
  },

  checkUserStatus: (userId) => {
    if (!userId) return;
    const socket = getSocket();
    if (socket) {
      socket.emit("get_user_status", userId, (status) => {
        set((state) => {
          const newOnlineUsers = new Map(state.onlineUsers);
          newOnlineUsers.set(userId, {
            isOnline: status.isOnline,
            lastSeen: status.lastSeen,
          });
          return { onlineUsers: newOnlineUsers };
        });
      });
    }
  },

  refreshAllUserStatuses: () => {
    const { conversations, currentUser } = get();
    const socket = getSocket();

    if (!socket || !conversations?.data) return;

    conversations.data.forEach((conv) => {
      const otherUser = conv.participants.find(
        (p) => p._id !== currentUser?._id
      );

      if (otherUser?._id) {
        socket.emit("get_user_status", otherUser._id, (status) => {
          set((state) => {
            const newOnlineUsers = new Map(state.onlineUsers);
            newOnlineUsers.set(otherUser._id, {
              isOnline: status.isOnline,
              lastSeen: status.lastSeen,
            });
            return { onlineUsers: newOnlineUsers };
          });
        });
      }
    });
  },

  cleanup: () => {
    set({
      conversation: [],
      currentConversation: null,
      messages: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
    });
  },
}));
