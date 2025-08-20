import { create } from "zustand";
import { getSocket } from "../services/chat.service";
import axiosInstance from "../services/url.service";

const useStatusStore = create((set, get) => ({
  statuses: [],
  loading: false,
  error: null,

  //Active
  setStatus: (statuses) => set({ statuses }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  //Initialize the socket listeners,

  initializeSocket: () => {
    const socket = getSocket();
    if (!socket) return;

    //Real-time status events
    socket.on("new_status", (newStatus) => {
      console.log("[DEBUG] new_status event received", newStatus);
      set((state) => {
        const exists = state.statuses.some((s) => s._id === newStatus._id);
        const updatedStatuses = exists
          ? state.statuses
          : [newStatus, ...state.statuses];
        console.log("[DEBUG] statuses after new_status:", updatedStatuses);
        return { statuses: updatedStatuses };
      });
    });
    socket.on("status_deleted", (statusId) => {
      console.log("[DEBUG] status_deleted event received", statusId);
      set((state) => {
        const updatedStatuses = state.statuses.filter(
          (s) => s._id !== statusId
        );
        console.log("[DEBUG] statuses after status_deleted:", updatedStatuses);
        return { statuses: updatedStatuses };
      });
    });
    socket.on("status_viewed", ({ statusId, viewers, totalViews }) => {
      console.log("[DEBUG] status_viewed event received", {
        statusId,
        viewers,
        totalViews,
      });
      set((state) => {
        const updatedStatuses = state.statuses.map((status) =>
          status._id === statusId ? { ...status, viewers, totalViews } : status
        );
        console.log("[DEBUG] statuses after status_viewed:", updatedStatuses);
        return { statuses: updatedStatuses };
      });
    });
    socket.on("status_liked", ({ statusId, likedBy }) => {
      console.log("[DEBUG] status_liked event received", { statusId, likedBy });
      set((state) => {
        const updatedStatuses = state.statuses.map((status) =>
          status._id === statusId ? { ...status, likedBy } : status
        );
        console.log("[DEBUG] statuses after status_liked:", updatedStatuses);
        return { statuses: updatedStatuses };
      });
    });
  },

  cleanupSocket: () => {
    const socket = getSocket();
    if (socket) {
      socket.off("new_status");
      socket.off("status_deleted");
      socket.off("status_viewed");
      socket.off("status_liked");
    }
  },

  fetchStatuses: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get("status");
      set({ statuses: data.data || [], loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  //create status
  createStatus: async (statusData) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();

      if (statusData.file) {
        formData.append("media", statusData.file);
      }

      if (statusData.content?.trim()) {
        formData.append("content", statusData.content);
      }

      if (statusData.backgroundColor) {
        formData.append("backgroundColor", statusData.backgroundColor);
      }

      if (statusData.caption?.trim()) {
        formData.append("caption", statusData.caption);
      }

      const { data } = await axiosInstance.post("/status", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      //add to status in local state
      if (data.data) {
        set((state) => ({
          statuses: state.statuses.some((s) => s._id === data.data._id)
            ? state.statuses
            : [...state.statuses, data.data],
        }));
      }
      set({ loading: false, error: null });
      return data.data;
    } catch (error) {
      console.error("Error creating status:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  //view status
  viewStatus: async (statusId) => {
    try {
      await axiosInstance.put(`status/${statusId}/view`);
      set((state) => ({
        statuses: state.statuses.map((status) =>
          status._id === statusId ? { ...status } : status
        ),
      }));
    } catch (error) {
      set({ error: error.message });
    }
  },

  deleteStatus: async (statusId) => {
    set({ loading: true, error: null });
    try {
      await axiosInstance.delete(`/status/${statusId}`);
      // Emit socket event for instant feedback
      const socket = getSocket();
      if (socket) {
        socket.emit("status_deleted", { statusId });
      }
      set((state) => ({
        statuses: state.statuses.filter((s) => s._id !== statusId),
      }));
      set({ loading: false, error: null });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  likeStatus: async (statusId) => {
    try {
      const { data } = await axiosInstance.put(`/status/${statusId}/like`);
      // Emit socket event for instant feedback
      const socket = getSocket();
      if (socket) {
        socket.emit("status_liked", { statusId, likedBy: data.data.likedBy });
      }
      // Update the status in local state with the updated like count
      set((state) => ({
        statuses: state.statuses.map((status) =>
          status._id === statusId
            ? { ...status, likedBy: data.data.likedBy }
            : status
        ),
      }));
      return data.data;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  getStatusViewers: async (statusId) => {
    try {
      set({ loading: true, error: null });
      const { data } = await axiosInstance.get(`/status/${statusId}/viewers`);
      return data.data || [];
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  getGroupedStatus: () => {
    const { statuses } = get();
    console.log("Raw statuses in getGroupedStatus:", statuses);
    return statuses.reduce((acc, status) => {
      const statusUserId = status.user?._id || status.userId;
      console.log("Processing status:", status, "userId:", statusUserId);
      if (!acc[statusUserId]) {
        acc[statusUserId] = {
          id: statusUserId,
          name: status.user?.username,
          avatar: status.user?.profilePicture || null,
          statuses: [],
        };
      }

      acc[statusUserId].statuses.push({
        id: status._id,
        media: status.content,
        content: status.content,
        contentType: status.contentType,
        backgroundColor: status.backgroundColor,
        caption: status.caption,
        timeStamp: status.createdAt,
        viewers: status.viewers,
        likedBy: status.likedBy,
      });
      return acc;
    }, {});
  },

  getUserStatuses: (userId) => {
    const groupedStatus = get().getGroupedStatus();
    return userId ? groupedStatus[userId] : null;
  },

  getOtherStatuses: (userId) => {
    const groupedStatus = get().getGroupedStatus();
    return Object.values(groupedStatus).filter(
      (contact) => contact.id !== userId
    );
  },

  clearError: () => {
    set({ statuses: [], loading: false, error: null });
  },
}));

export default useStatusStore;
