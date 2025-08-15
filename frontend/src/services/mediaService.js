class MediaService {
  constructor() {
    this.currentStream = null;
    this.streamUsers = new Set(); // Track who's using the stream
  }

  async getMediaStream(constraints = { video: true, audio: true }) {
    try {
      // If we have a stream that's compatible, reuse it.
      if (this.currentStream && this.isStreamCompatible(constraints)) {
        console.log("📹 MEDIA SERVICE: Reusing existing stream");
        const streamId = Date.now() + Math.random();
        this.streamUsers.add(streamId);
        console.log("📹 MEDIA SERVICE: Current users:", this.streamUsers.size);
        return { stream: this.currentStream.clone(), streamId };
      }

      // If the existing stream is in use by other components, we can't just stop it.
      if (this.currentStream && this.streamUsers.size > 0) {
        console.warn(
          "📹 MEDIA SERVICE: A non-compatible stream is in use. The new request may fail if it needs the same device."
        );
      }

      // Request a new stream from the hardware.
      console.log(
        "📹 MEDIA SERVICE: Requesting new media stream with constraints:",
        constraints
      );
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // If we successfully got a new stream, stop any old, unused stream.
      if (this.currentStream && this.streamUsers.size === 0) {
        console.log("📹 MEDIA SERVICE: Stopping old, unused stream.");
        this.stopStream();
      }

      this.currentStream = stream;
      const streamId = Date.now() + Math.random();
      this.streamUsers.add(streamId);

      console.log(
        "📹 MEDIA SERVICE: New stream created with tracks:",
        stream.getTracks().map((t) => t.kind)
      );
      console.log("📹 MEDIA SERVICE: Current users:", this.streamUsers.size);

      return { stream: stream.clone(), streamId };
    } catch (error) {
      console.error("📹 MEDIA SERVICE: Error getting media stream:", error);
      throw error;
    }
  }

  isStreamCompatible(constraints) {
    if (!this.currentStream || !this.currentStream.active) {
      this.currentStream = null; // Clear out inactive stream
      return false;
    }

    const hasVideo = this.currentStream
      .getVideoTracks()
      .some((t) => t.readyState === "live");
    const hasAudio = this.currentStream
      .getAudioTracks()
      .some((t) => t.readyState === "live");

    const needsVideo = constraints.video !== false;
    const needsAudio = constraints.audio !== false;

    // It's compatible if it has everything that's needed.
    return (!needsVideo || hasVideo) && (!needsAudio || hasAudio);
  }

  releaseStream(streamId) {
    if (streamId && this.streamUsers.has(streamId)) {
      this.streamUsers.delete(streamId);
      console.log(
        `📹 MEDIA SERVICE: Released stream for user. Remaining users:`,
        this.streamUsers.size
      );
    }

    // If no one is using the stream, we can stop it after a delay to allow for quick re-use.
    if (this.streamUsers.size === 0 && this.currentStream) {
      console.log(
        "📹 MEDIA SERVICE: No more users, will stop stream in 2 seconds."
      );
      setTimeout(() => {
        if (this.streamUsers.size === 0 && this.currentStream) {
          this.stopStream();
        }
      }, 2000);
    }
  }

  stopStream() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => {
        track.stop();
        console.log(`📹 MEDIA SERVICE: Stopped ${track.kind} track`);
      });
      this.currentStream = null;
      this.streamUsers.clear();
      console.log("📹 MEDIA SERVICE: Stream completely stopped and cleared.");
    }
  }

  getStreamInfo() {
    if (!this.currentStream) return { status: "No active stream", users: 0 };

    return {
      status: this.currentStream.active ? "Active" : "Inactive",
      hasVideo: this.currentStream
        .getVideoTracks()
        .some((t) => t.readyState === "live"),
      hasAudio: this.currentStream
        .getAudioTracks()
        .some((t) => t.readyState === "live"),
      users: this.streamUsers.size,
      tracks: this.currentStream.getTracks().map((t) => ({
        kind: t.kind,
        enabled: t.enabled,
        id: t.id.slice(0, 8),
        readyState: t.readyState,
      })),
    };
  }
}

// Create singleton instance
const mediaService = new MediaService();

export default mediaService;
