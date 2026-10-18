import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);

    // If chunk loading failed (new deployment published), automatically attempt one clean reload
    const isChunkError =
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("dynamically imported module") ||
      error?.name === "ChunkLoadError";

    if (isChunkError) {
      const hasRetried = sessionStorage.getItem("fazilnagar_chunk_reload_retry");
      if (!hasRetried) {
        sessionStorage.setItem("fazilnagar_chunk_reload_retry", "true");
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem("fazilnagar_chunk_reload_retry");
    window.location.reload();
  };

  handleHome = () => {
    sessionStorage.removeItem("fazilnagar_chunk_reload_retry");
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] w-full flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 font-heading">
                Unable to Load Section / लोड करने में त्रुटि
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                A temporary network issue or recent portal update prevented this view from finishing.
                Refreshing the page usually resolves it immediately.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#18232E] hover:bg-[#B8323C] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Page / पुनः लोड करें</span>
              </button>

              <button
                type="button"
                onClick={this.handleHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Home className="w-4 h-4 text-slate-500" />
                <span>Home / होम</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
