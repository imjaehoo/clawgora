"use client";

import { Component, type ReactNode } from "react";
import { Shell } from "./shell";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || "Unknown error" };
  }

  componentDidCatch(error: Error) {
    console.error("DashboardErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Shell>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{this.props.fallbackTitle || "Something went wrong"}</h1>
          <p style={{ color: "var(--muted)", marginBottom: 16 }}>
            Failed to load this section. Try refreshing the page.
          </p>
          {this.state.message && (
            <p style={{ color: "var(--danger)", fontSize: 13 }}>{this.state.message}</p>
          )}
        </Shell>
      );
    }

    return this.props.children;
  }
}
