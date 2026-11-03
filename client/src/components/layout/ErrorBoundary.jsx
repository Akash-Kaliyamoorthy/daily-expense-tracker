import { Component } from 'react';

/** Last line of defence: a crash in one screen shows a recovery message, not a blank page. */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">This screen hit a problem</h1>
        <p className="muted max-w-sm text-sm leading-relaxed">
          Reloading usually fixes it. Your data is saved on the server.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="h-11 rounded-control bg-ink-800 px-4 text-sm font-medium text-white hover:bg-ink-700"
        >
          Reload the app
        </button>
      </div>
    );
  }
}
