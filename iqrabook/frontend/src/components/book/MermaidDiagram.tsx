"use client";

import { Component, ReactNode, useEffect, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
}

class MermaidErrorBoundary extends Component<
  { children: ReactNode; fallback: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <pre className="text-iq-red text-[11px] whitespace-pre-wrap font-mono">
          {this.props.fallback}
        </pre>
      );
    }
    return this.props.children;
  }
}

function MermaidInner({ chart }: MermaidDiagramProps) {
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined" || !chart) return;
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#E63946",
            primaryTextColor: "#FFF8F0",
            primaryBorderColor: "#FF6B8A",
            lineColor: "#FF9F1C",
            secondaryColor: "#1A1A2E",
            tertiaryColor: "#0F0F1A",
          },
        });
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(rendered);
          setFailed(false);
        }
      } catch (e) {
        console.warn("Mermaid render failed:", e);
        if (!cancelled) setFailed(true);
      }
    };

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (failed) {
    return (
      <pre className="text-iq-red text-[11px] whitespace-pre-wrap font-mono">{chart}</pre>
    );
  }

  return (
    <div
      className="w-full overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  return (
    <MermaidErrorBoundary fallback={chart}>
      <MermaidInner chart={chart} />
    </MermaidErrorBoundary>
  );
}
