import React, { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import "echarts-wordcloud";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8081";

interface CloudDatum { name: string; value: number }
interface SyncState {
  counts: Record<string, number>;
  cloudData: CloudDatum[];
  shape: string | null;
  version: number;
}

function getOption(data: CloudDatum[], shape: string | null) {
  const series: any = {
    type: "wordCloud",
    gridSize: 8,
    sizeRange: [12, 64],
    rotationRange: [0, 0],
    drawOutOfBound: true,
    layoutAnimation: false,
    textStyle: {
      fontFamily: "sans-serif",
      fontWeight: "bold",
      // ✅ 백틱 사용해야 함
      color: () =>
        `rgb(${Math.round(Math.random() * 160)}, ${Math.round(
          Math.random() * 160
        )}, ${Math.round(Math.random() * 160)})`,
    },
    data,
  };
  if (shape) series.shape = shape;
  return { series: [series], animation: false };
}

export default function Output() {
  const [state, setState] = useState<SyncState>({
    counts: {},
    cloudData: [],
    shape: null,
    version: 0,
  });

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => console.log("[Output] WS open:", WS_URL);
    ws.onerror = (e) => console.error("[Output] WS error:", e);
    ws.onclose = () => console.log("[Output] WS close");
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg?.type === "state" && msg.payload) {
          console.log("[Output] got state v", msg.payload.version, msg.payload);
          setState(msg.payload as SyncState);
        }
      } catch (e) {
        console.error("[Output] parse error:", e);
      }
    };
    return () => ws.close();
  }, []);

  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <h2>실시간 표시 (디스플레이 전용)</h2>
      <div style={{ height: "75vh", width: "100%" }}>
        <ReactECharts
          // ✅ key도 백틱 써야 함
          key={`disp-${state.version}`}
          option={getOption(state.cloudData, state.shape)}
          notMerge
          lazyUpdate={false}
          style={{ height: "100%", width: "100%" }}
        />
      </div>
      <small>버전: {state.version} · 단어 수: {Object.keys(state.counts).length}</small>
    </div>
  );
}
