import React from "react";

interface Props { children: React.ReactNode }
interface State { hasError: boolean; message?: string }

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "An unexpected application error occurred.",
    };
  }

  componentDidCatch(error: unknown) {
    // Keep production UX clean while still leaving a useful console error for debugging.
    console.error("RENFLIX application error:", error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-navy-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-navy-700 bg-navy-900 p-6 shadow-2xl text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xl font-bold">!</div>
          <h1 className="font-display text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-navy-300">RENFLIX could not render this screen. Try again without leaving the app.</p>
          {this.state.message && <p className="mt-3 text-xs text-navy-500 break-words">{this.state.message}</p>}
          <button type="button" onClick={this.handleRetry} className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">Try again</button>
        </div>
      </div>
    );
  }
}
