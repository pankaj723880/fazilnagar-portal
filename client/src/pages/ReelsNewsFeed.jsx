import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import API from "../api";
import {
  Newspaper,
  Share2,
  Heart,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  BookOpen,
  Volume2,
  VolumeX,
  Check,
  X,
  Send,
  Trash2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

const FALLBACK_COVER_IMAGE =
  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop";

export default function ReelsNewsFeed() {
  const [searchParams] = useSearchParams();
  const targetStoryId = searchParams.get("storyId") || searchParams.get("targetId");

  const [stories, setStories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [readingStory, setReadingStory] = useState(null); // Full article modal
  const [videoMuted, setVideoMuted] = useState(true);
  const [copiedToast, setCopiedToast] = useState("");

  // Comments drawer state
  const [commentDrawerStory, setCommentDrawerStory] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [guestAuthorName, setGuestAuthorName] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState("");

  // Current logged in user (if any)
  const [currentUser, setCurrentUser] = useState(null);

  const containerRef = useRef(null);
  const storyRefs = useRef([]);

  // Sync user from local storage
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (_) {}
    }
  }, []);

  // Lock body scroll while on Local Updates / News page, restore on unmount
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow || "";
      document.documentElement.style.overflow = originalHtmlOverflow || "";
    };
  }, []);

  // Fetch stories from MongoDB API
  const fetchStories = useCallback(
    async (pageNum = 1, replace = false) => {
      if (pageNum === 1) {
        setLoading(true);
        setFetchError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        let anonId = localStorage.getItem("fazil_anon_id");
        if (!anonId) {
          anonId = "anon_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
          localStorage.setItem("fazil_anon_id", anonId);
        }

        let url = `/news/feed?page=${pageNum}&limit=8&anonId=${encodeURIComponent(anonId)}`;
        if (pageNum === 1 && targetStoryId) {
          url += `&storyId=${encodeURIComponent(targetStoryId)}`;
        }

        const res = await API.get(url);
        const fetched = res.data?.stories || [];

        setTotalPages(res.data?.totalPages || 1);
        setHasMore(res.data?.hasMore || false);

        if (replace || pageNum === 1) {
          setStories(fetched);
          setActiveStoryIndex(0);
        } else {
          setStories((prev) => {
            const existingIds = new Set(prev.map((s) => String(s._id)));
            const newUnique = fetched.filter((s) => !existingIds.has(String(s._id)));
            return [...prev, ...newUnique];
          });
        }
      } catch (err) {
        console.error("Failed to load reels news feed:", err);
        setFetchError("Unable to load latest town news. Please check connection.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [targetStoryId]
  );

  // Initial load
  useEffect(() => {
    setPage(1);
    fetchStories(1, true);
  }, [fetchStories]);

  // Load next page
  const loadNextPage = () => {
    if (!loadingMore && hasMore && page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchStories(nextPage, false);
    }
  };

  // Scroll observer to track active reel
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
    if (clientHeight <= 0) return;

    const index = Math.round(scrollTop / clientHeight);
    if (index !== activeStoryIndex && index >= 0 && index < stories.length) {
      setActiveStoryIndex(index);
    }

    // Trigger pagination when approaching end of feed
    if (scrollHeight - (scrollTop + clientHeight) < clientHeight * 1.5) {
      loadNextPage();
    }
  };

  // Keyboard navigation (Arrow Up / Down)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (readingStory || commentDrawerStory) return; // Disable during modals/drawers
      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollToStory(activeStoryIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollToStory(activeStoryIndex - 1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStoryIndex, stories.length, readingStory, commentDrawerStory]);

  const scrollToStory = (index) => {
    if (index >= 0 && index < stories.length && containerRef.current) {
      const targetY = index * containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: targetY,
        behavior: "smooth",
      });
      setActiveStoryIndex(index);
    }
  };

  // -------------------------------------------------------------
  // LIKE TOGGLE HANDLER (Optimistic UI + Server Sync)
  // -------------------------------------------------------------
  const handleToggleLike = async (storyId) => {
    const currentStory = stories.find((s) => String(s._id) === String(storyId));
    if (!currentStory) return;

    const currentlyLiked = !!currentStory.isLiked;
    const prevLikeCount = currentStory.likeCount ?? 0;
    const newLikeCount = currentlyLiked
      ? Math.max(0, prevLikeCount - 1)
      : prevLikeCount + 1;

    // Optimistic state update
    setStories((prev) =>
      prev.map((s) =>
        String(s._id) === String(storyId)
          ? { ...s, isLiked: !currentlyLiked, likeCount: newLikeCount }
          : s
      )
    );

    try {
      const anonId = localStorage.getItem("fazil_anon_id");
      const res = await API.post(`/news/${storyId}/like`, { anonId });
      // Update with server verified count
      if (res.data) {
        setStories((prev) =>
          prev.map((s) =>
            String(s._id) === String(storyId)
              ? {
                  ...s,
                  isLiked: res.data.liked,
                  likeCount: res.data.likeCount,
                }
              : s
          )
        );
      }
    } catch (err) {
      console.error("Like toggle failed:", err);
      // Rollback on failure
      setStories((prev) =>
        prev.map((s) =>
          String(s._id) === String(storyId)
            ? { ...s, isLiked: currentlyLiked, likeCount: prevLikeCount }
            : s
        )
      );
    }
  };

  // -------------------------------------------------------------
  // SHARE STORY HANDLER
  // -------------------------------------------------------------
  const handleShare = async (story) => {
    const shareUrl = `${window.location.origin}/news?storyId=${story._id}`;
    const shareData = {
      title: `${story.title} | Fazilnagar Updates`,
      text: story.summary || story.description || "Read latest town update on Fazilnagar Portal",
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (_) {
        // User cancelled share or unsupported
      }
    } else {
      // Fallback copy link
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedToast("Story link copied to clipboard!");
        setTimeout(() => setCopiedToast(""), 3000);
      } catch (_) {
        // Fallback prompt
        window.prompt("Copy story link:", shareUrl);
        setCopiedToast("Story link ready!");
        setTimeout(() => setCopiedToast(""), 3000);
      }
    }
  };

  // -------------------------------------------------------------
  // COMMENTS DRAWER HANDLERS
  // -------------------------------------------------------------
  const openCommentsDrawer = async (story) => {
    setCommentDrawerStory(story);
    setComments([]);
    setCommentsLoading(true);
    setCommentError("");
    setCommentText("");

    try {
      const res = await API.get(`/news/${story._id}/comments?limit=50`);
      setComments(res.data?.comments || []);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setCommentError("Failed to load comments.");
    } finally {
      setCommentsLoading(false);
    }
  };

  const closeCommentsDrawer = () => {
    setCommentDrawerStory(null);
    setComments([]);
    setCommentError("");
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !commentDrawerStory) return;
    if (commentText.trim().length > 500) {
      setCommentError("Comment cannot exceed 500 characters.");
      return;
    }

    setSubmittingComment(true);
    setCommentError("");

    try {
      const payload = {
        text: commentText.trim(),
        authorName: currentUser?.name || guestAuthorName.trim() || undefined,
      };

      const res = await API.post(
        `/news/${commentDrawerStory._id}/comments`,
        payload
      );

      const createdComment = res.data?.comment;
      if (createdComment) {
        setComments((prev) => [createdComment, ...prev]);
        setCommentText("");

        // Update comment count on story
        const newCount = res.data?.commentCount ?? (commentDrawerStory.commentCount + 1);
        setStories((prev) =>
          prev.map((s) =>
            String(s._id) === String(commentDrawerStory._id)
              ? { ...s, commentCount: newCount }
              : s
          )
        );
        setCommentDrawerStory((prev) => (prev ? { ...prev, commentCount: newCount } : prev));
      }
    } catch (err) {
      console.error("Comment submission error:", err);
      setCommentError(
        err.response?.data?.message || "Failed to post comment. Try again."
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentDrawerStory || !window.confirm("Delete this comment?")) return;

    try {
      const res = await API.delete(
        `/news/${commentDrawerStory._id}/comments/${commentId}`
      );

      setComments((prev) => prev.filter((c) => String(c._id) !== String(commentId)));

      const newCount = res.data?.commentCount ?? Math.max(0, (commentDrawerStory.commentCount || 1) - 1);
      setStories((prev) =>
        prev.map((s) =>
          String(s._id) === String(commentDrawerStory._id)
            ? { ...s, commentCount: newCount }
            : s
        )
      );
      setCommentDrawerStory((prev) => (prev ? { ...prev, commentCount: newCount } : prev));
    } catch (err) {
      console.error("Delete comment error:", err);
      alert(err.response?.data?.message || "Unable to delete comment.");
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return "Recently";
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch (_) {
      return "Recently";
    }
  };

  return (
    <div className="w-full h-[calc(100dvh-88px-56px)] sm:h-[calc(100vh-96px)] bg-[#0B1118] flex items-center justify-center relative select-none overflow-hidden overscroll-none">
      
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed top-24 z-50 bg-[#168568] text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Main Reels Snap-Scroll Feed Container */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full sm:max-w-[430px] h-full sm:max-h-[820px] overflow-y-scroll snap-y snap-mandatory scroll-smooth relative rounded-none sm:rounded-3xl border-0 sm:border border-slate-800/80 bg-black shadow-2xl no-scrollbar overscroll-contain flex flex-col"
      >
        {/* Loading Spinner State */}
        {loading && (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-4 p-8 text-center bg-[#0B1118]">
            <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-[#B8323C] animate-spin"></div>
            <p className="text-xs text-slate-400 font-semibold">
              Loading Fazilnagar Local Updates...
            </p>
          </div>
        )}

        {/* Fetch Error State */}
        {!loading && fetchError && (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#0B1118]">
            <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto">
              <Newspaper className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-white">Connection Error</h3>
            <p className="text-xs text-slate-400 max-w-xs">{fetchError}</p>
            <button
              onClick={() => fetchStories(1, true)}
              className="bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty Stories State */}
        {!loading && !fetchError && stories.length === 0 && (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#0B1118]">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Newspaper className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">No Stories Published Yet</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Town bulletins and civic reports will appear here as soon as approved by the admin desk.
            </p>
          </div>
        )}

        {/* Stories List */}
        {!loading &&
          !fetchError &&
          stories.map((story, idx) => {
            const isLiked = !!story.isLiked;
            const likeCount = story.likeCount ?? 0;
            const commentCount = story.commentCount ?? 0;
            const coverImage = story.image || FALLBACK_COVER_IMAGE;

            return (
              <article
                key={story._id || idx}
                ref={(el) => (storyRefs.current[idx] = el)}
                className="w-full h-full min-h-full snap-start snap-always relative flex flex-col justify-end overflow-hidden shrink-0"
              >
                {/* Media Layer (Video or Cover Image) */}
                <div className="absolute inset-0 z-0 bg-slate-950">
                  {story.video ? (
                    <video
                      src={story.video}
                      poster={coverImage}
                      autoPlay={idx === activeStoryIndex}
                      loop
                      muted={videoMuted}
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={coverImage}
                      alt={story.title}
                      className="w-full h-full object-cover object-center"
                      loading={idx === 0 ? "eager" : "lazy"}
                    />
                  )}

                  {/* Gradient Overlay for Readable Text & Controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent pointer-events-none" />
                </div>

                {/* Right Floating Actions Rail (Reels / Shorts Style) */}
                <div className="absolute right-3.5 bottom-20 sm:bottom-24 z-20 flex flex-col items-center gap-4">
                  {/* Video Mute Toggle */}
                  {story.video && (
                    <button
                      onClick={() => setVideoMuted(!videoMuted)}
                      className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition cursor-pointer shadow-lg"
                      title={videoMuted ? "Unmute" : "Mute"}
                      aria-label="Toggle mute"
                    >
                      {videoMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                    </button>
                  )}

                  {/* Like Button */}
                  <button
                    onClick={() => handleToggleLike(story._id)}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                    aria-label="Like story"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-200 shadow-lg ${
                        isLiked
                          ? "bg-[#B8323C] text-white scale-110 shadow-red-600/40"
                          : "bg-black/60 text-white hover:bg-black/80"
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
                    </div>
                    <span className="text-[11px] font-bold text-white drop-shadow-md">
                      {likeCount}
                    </span>
                  </button>

                  {/* Comment Button */}
                  <button
                    onClick={() => openCommentsDrawer(story)}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                    aria-label="Open comments"
                  >
                    <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition shadow-lg">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-white drop-shadow-md">
                      {commentCount}
                    </span>
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={() => handleShare(story)}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                    aria-label="Share story"
                  >
                    <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition shadow-lg">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-white drop-shadow-md">
                      Share
                    </span>
                  </button>

                  {/* Read Article Button */}
                  <button
                    onClick={() => setReadingStory(story)}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                    aria-label="Read full article"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#18232E]/90 backdrop-blur-md text-amber-400 border border-amber-400/40 flex items-center justify-center hover:bg-[#18232E] transition shadow-lg">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-white drop-shadow-md">
                      Read
                    </span>
                  </button>
                </div>

                {/* Bottom Story Content Overlay */}
                <div className="relative z-10 p-5 sm:p-6 pr-16 space-y-2 pb-5">
                  {/* Badges: Category, Location, Pinned */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="bg-[#B8323C] text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md tracking-wider shadow-sm">
                      {story.category || "Local Update"}
                    </span>

                    {story.isFeatured && (
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Pinned</span>
                      </span>
                    )}

                    {story.location && (
                      <span className="bg-black/60 backdrop-blur-md text-slate-300 text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#B8323C]" />
                        <span>{story.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Headline */}
                  <h2
                    onClick={() => setReadingStory(story)}
                    className="text-base sm:text-lg font-extrabold text-white leading-snug tracking-tight font-heading hover:text-red-200 transition cursor-pointer"
                  >
                    {story.title}
                  </h2>

                  {/* Hindi Headline (if available) */}
                  {story.titleHi && (
                    <p className="text-xs text-slate-200 font-medium leading-relaxed">
                      {story.titleHi}
                    </p>
                  )}

                  {/* Summary */}
                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {story.summary || story.description}
                  </p>

                  {/* Author / Source & Publication Time */}
                  <div className="pt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-white truncate max-w-[150px]">
                        {story.source || "Fazilnagar Bureau"}
                      </span>
                      <span>•</span>
                      <span>{formatRelativeTime(story.publishedAt || story.createdAt)}</span>
                    </div>

                    <button
                      onClick={() => setReadingStory(story)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition shrink-0 cursor-pointer"
                    >
                      <span>Full Story</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
      </main>

      {/* Desktop Floating Next / Prev Navigation Buttons */}
      <aside
        aria-label="Story Navigation"
        className="hidden lg:flex fixed right-10 bottom-1/2 translate-y-1/2 flex-col gap-3 z-30"
      >
        <button
          onClick={() => scrollToStory(activeStoryIndex - 1)}
          disabled={activeStoryIndex === 0}
          className="w-12 h-12 rounded-2xl bg-slate-900/90 text-white border border-slate-700/80 flex items-center justify-center hover:bg-[#B8323C] hover:border-[#B8323C] disabled:opacity-20 disabled:hover:bg-slate-900 transition shadow-xl cursor-pointer"
          title="Previous Story (Up Arrow)"
        >
          <ChevronUp className="w-6 h-6" />
        </button>

        <button
          onClick={() => scrollToStory(activeStoryIndex + 1)}
          disabled={activeStoryIndex >= stories.length - 1}
          className="w-12 h-12 rounded-2xl bg-slate-900/90 text-white border border-slate-700/80 flex items-center justify-center hover:bg-[#B8323C] hover:border-[#B8323C] disabled:opacity-20 disabled:hover:bg-slate-900 transition shadow-xl cursor-pointer"
          title="Next Story (Down Arrow)"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </aside>

      {/* ========================================================
          COMMENTS DRAWER / BOTTOM SHEET
          ======================================================== */}
      {commentDrawerStory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[#18232E] text-white w-full max-w-lg h-[75vh] sm:h-[620px] rounded-t-3xl sm:rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700/80 bg-slate-900/90 shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#B8323C]" />
                <h3 className="text-sm font-extrabold tracking-tight">
                  Comments ({commentDrawerStory.commentCount || comments.length})
                </h3>
              </div>
              <button
                onClick={closeCommentsDrawer}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {commentsLoading && (
                <div className="py-12 text-center text-xs text-slate-400">
                  Loading comments...
                </div>
              )}

              {!commentsLoading && comments.length === 0 && (
                <div className="py-12 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">No comments yet</p>
                  <p className="text-[11px] text-slate-400">Be the first to share your thoughts on this story.</p>
                </div>
              )}

              {!commentsLoading &&
                comments.map((c) => {
                  const canDelete =
                    currentUser?.role === "admin" ||
                    (currentUser?.id && c.userId && String(currentUser.id) === String(c.userId));

                  return (
                    <div
                      key={c._id}
                      className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-white">
                            {c.authorName || "Resident"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(c.createdAt)}
                          </span>
                        </div>

                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(c._id)}
                            className="text-slate-400 hover:text-red-400 p-1 transition cursor-pointer"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed break-words">
                        {c.text}
                      </p>
                    </div>
                  );
                })}
            </div>

            {/* Comment Post Form */}
            <form
              onSubmit={handlePostComment}
              className="p-3 border-t border-slate-700/80 bg-slate-900/90 space-y-2 shrink-0"
            >
              {commentError && (
                <div className="text-[11px] text-red-400 bg-red-950/60 p-2 rounded-lg border border-red-800">
                  {commentError}
                </div>
              )}

              {!currentUser && (
                <input
                  type="text"
                  placeholder="Your Name (Optional)"
                  value={guestAuthorName}
                  onChange={(e) => setGuestAuthorName(e.target.value)}
                  maxLength={50}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#B8323C]"
                />
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={500}
                  disabled={submittingComment}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#B8323C]"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="bg-[#B8323C] hover:bg-[#991B1B] disabled:opacity-40 text-white p-2 rounded-xl transition cursor-pointer"
                  title="Post comment"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          FULL ARTICLE MODAL (Preserves user's reel position)
          ======================================================== */}
      {readingStory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-[#18232E] text-white w-full max-w-2xl max-h-[88vh] rounded-t-3xl sm:rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-700/80 bg-slate-900/90 sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="bg-[#B8323C] text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full">
                  {readingStory.category || "Local Update"}
                </span>
                <span className="text-xs text-slate-400">
                  {readingStory.location || "Fazilnagar"}
                </span>
              </div>

              <button
                onClick={() => setReadingStory(null)}
                className="w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1">
              {readingStory.image && (
                <div className="w-full h-56 sm:h-72 rounded-2xl overflow-hidden bg-slate-950">
                  <img
                    src={readingStory.image}
                    alt={readingStory.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading leading-tight">
                  {readingStory.title}
                </h2>
                {readingStory.titleHi && (
                  <p className="text-sm font-semibold text-slate-300">
                    {readingStory.titleHi}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-400 pt-1 border-b border-slate-700/60 pb-3">
                  <span>
                    Reported by: <strong className="text-white">{readingStory.source || "Town Reporter"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(readingStory.publishedAt || readingStory.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Summary Lead Paragraph */}
              {readingStory.summary && (
                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700/60 text-slate-200 text-xs sm:text-sm leading-relaxed font-medium italic">
                  "{readingStory.summary}"
                </div>
              )}

              {/* Complete Article Content */}
              <div className="text-slate-300 text-xs sm:text-sm leading-relaxed space-y-3 whitespace-pre-line">
                {readingStory.content || readingStory.description}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700/80 bg-slate-900/90 flex items-center justify-between shrink-0">
              <button
                onClick={() => handleShare(readingStory)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Story</span>
              </button>

              <button
                onClick={() => setReadingStory(null)}
                className="bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
