import React from "react";

type ChartErrorBoundaryProps = {
  fallbackText?: string;
  children: React.ReactNode;
};

type ChartErrorBoundaryState = {
  hasError: boolean;
};

export default class ChartErrorBoundary extends React.Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Keep errors visible in devtools while preventing full-page crash.
    // eslint-disable-next-line no-console
    console.error("Chart rendering failed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="g-banner g-banner-warn">
          {this.props.fallbackText || "Chart failed to load. Refresh or check chart setup."}
        </div>
      );
    }

    return this.props.children;
  }
}
