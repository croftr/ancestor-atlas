import { Component, type ReactNode } from "react";

interface Props {
  /** What failed, for the message ("This page", "This card"). */
  what: string;
  /** A change (another page, another card) clears the error and tries again. */
  resetKey: string;
  /** Card fallbacks get a Close button; pages don't need one. */
  onClose?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Keeps an error in one page or card from blanking the whole app (React unmounts everything on an
 * uncaught render error): that part says it couldn't be shown, the rest carries on.
 */
export default class ErrorBoundary extends Component<Props, { error: Error | null; key: string }> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: { error: Error | null; key: string }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null;
  }

  componentDidCatch(error: Error) {
    console.error(`${this.props.what} failed to render`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className={`panel error-note ${this.props.className ?? ""}`} role="alert">
        <p>{this.props.what} couldn't be shown. Refreshing the page may help.</p>
        <div className="error-note-actions">
          {this.props.onClose && (
            <button type="button" onClick={this.props.onClose}>
              Close
            </button>
          )}
          <button type="button" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      </div>
    );
  }
}
