import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, CssBaseline, Toolbar, Typography, Card, CardContent,
  Grid, TextField, Button, ButtonGroup, Stack
} from "@mui/material";

/* ===== WS 서버 주소 ===== */
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8081";

/* ===== 타입 ===== */
interface CloudDatum { name: string; value: number }
interface SyncState {
  counts: Record<string, number>;
  cloudData: CloudDatum[];
  shape: string | null;
  version: number;
}

/* =================================================================== */
/* 조사 제거 + 명사/형용사/동사만 추출 (표제어 “…다” 정규화 포함, 경량 규칙) */
/* =================================================================== */
const STOP = new Set([
  "하다","되다","있다","없다","같다","입니다","그리고","그러나",
  "저는","제가","너무","정말","그냥","그래서","근데","또한"
]);

// (주의) 이/가/에/의는 의미 영향 커서 남겨두고, 그 외만 제거
const SINGLE_JOSA = ["은","는","을","를","도","와","과","랑"];
const MULTI_JOSA = [
  "으로","에서","보다","께서","에게","에게서","한테","한테서",
  "으로서","으로써","까지","부터","마저","조차","뿐","마다",
  "이라도","라도","이나","든지","으로부터","처럼","같이","께"
];

const isKo = (t: string) => /^[가-힣]+$/u.test(t);

function stripJosa(w: string) {
  if (w.length < 2) return w;
  for (const j of MULTI_JOSA) {
    if (w.endsWith(j) && w.length > j.length) return w.slice(0, -j.length);
  }
  for (const j of SINGLE_JOSA) {
    if (w.endsWith(j) && w.length > 1) return w.slice(0, -j.length);
  }
  return w;
}

/** 흔한 어미를 “…다” 기본형으로 정규화(간단 규칙) */
function lemmatizeVerbAdj(w: string): string {
  // 예) 귀여워요/귀엽네요/귀엽습니다 → 귀엽다 (근사치 규칙들)
  const rules: Array<[RegExp, (stem: string) => string]> = [
    // 하다류
    [/^(.*?)(해요|합니다|한다|했다|했어요|했네|했군)$/, (stem) => stem + "하다"],
    // ㅂ불규칙(춥/덥) 근사: 워요/웠- → 우다
    [/^(.*?)(워요|웠어요|웠다|웠네|웠군)$/, (stem) => stem + "우다"],
    // 어요/아요/네요/습니다/요 등 일반적인 종결
    [/^(.*?)(어요|였어요|였다|았어요|았다|네요|습니다|습니까|요)$/, (stem) => stem + "다"],
  ];
  for (const [re, toLemma] of rules) {
    const m = w.match(re);
    if (m) return toLemma(m[1]);
  }
  return w;
}

/** 문장에서 [명사 + 동/형용사(…다)]만 남기기 */
function extractWords(sentence: string): string[] {
  const tokens = sentence.split(/[\s,.!?~()\[\]"'“”‘’·]+/);
  const out: string[] = [];
  for (const t of tokens) {
    if (!t) continue;
    let w = stripJosa(t);
    if (!w) continue;
    if (!isKo(w)) continue;
    if (w.length < 2 || w.length > 12) continue;

    // 불용어 1차 제외
    if (STOP.has(w)) continue;

    // 동/형용사 후보면 “…다”로 정규화 시도
    if (!w.endsWith("다")) {
      const lemma = lemmatizeVerbAdj(w);
      if (lemma.endsWith("다")) w = lemma; // 동/형용사로 확정
    }
    // 여기서 w가 “…다”면 동/형용사, 아니면 명사 취급
    // (명사라도 불용어/조사 제외 후 2~12자 한글이면 OK)
    if (!STOP.has(w)) out.push(w);
  }
  return out;
}

/* ===== 웹소켓 ===== */
function useWS() {
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === 1) return wsRef.current;
    wsRef.current = new WebSocket(WS_URL);
    wsRef.current.addEventListener("open", () => console.log("[Controller] WS open:", WS_URL));
    wsRef.current.addEventListener("error", (e) => console.error("[Controller] WS error:", e));
    wsRef.current.addEventListener("close", () => console.log("[Controller] WS close"));
    return wsRef.current;
  }, []);

  const send = useCallback((msg: any) => {
    const sock = wsRef.current || connect();
    const data = JSON.stringify(msg);
    if (sock.readyState === 1) {
      sock.send(data);
    } else {
      sock.addEventListener("open", () => sock.send(data), { once: true });
    }
  }, [connect]);

  return { connect, send };
}

/* ===== 컴포넌트 ===== */
export default function App2() {
  const [input, setInput] = useState("");
  const [shape, setShape] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { connect, send } = useWS();

  useEffect(() => { connect(); }, [connect]);

  const buildCloud = (c: Record<string, number>): CloudDatum[] =>
    Object.entries(c)
      .map(([name, n]) => ({ name, value: Math.log2(n + 1) }))
      .sort((a, b) => b.value - a.value);

  const pushState = (nextCounts: Record<string, number>, nextShape: string | null, nextVersion: number) => {
    const cloudData = buildCloud(nextCounts);
    const payload: SyncState = { counts: nextCounts, cloudData, shape: nextShape, version: nextVersion };
    console.log("[Controller] send state v", nextVersion, payload);
    send({ type: "state", payload });
  };

  const onAdd = () => {
    const s = input.trim();
    if (!s) return;

    const words = extractWords(s);        // ✅ 개선된 추출 함수
    if (words.length === 0) { setInput(""); return; }

    const next = { ...counts };
    for (const w of words) next[w] = (next[w] || 0) + 1; // 중복 단어 누적

    const v = version + 1;
    setCounts(next);
    setVersion(v);
    pushState(next, shape, v);
    setInput("");
  };

  const onShape = (v: string | null) => {
    const ver = version + 1;
    setShape(v);
    setVersion(ver);
    pushState(counts, v, ver);
  };

  // BrowserRouter면 "/display", HashRouter면 "/#/display"로 변경
  const openDisplay = () => window.open("/#/display", "display", "width=1000,height=800");

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Box sx={{ p: 3 }}>
          <Toolbar />
          <Typography variant="h5" mb={3}>입력 전용 (App2)</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6">문장 입력</Typography>
                    <Button variant="outlined" onClick={openDisplay}>디스플레이 창 열기</Button>
                  </Stack>

                  <ButtonGroup variant="outlined" sx={{ mb: 2 }}>
                    {[{label:"동그라미", v:"circle"},
                      {label:"네모", v:"square"},
                      {label:"별", v:"star"},
                      {label:"원본", v:"original"}]
                      .map(({label, v}) => (
                        <Button key={v} onClick={() => onShape(v === "original" ? null : v)}>
                          {label}
                        </Button>
                      ))}
                  </ButtonGroup>

                  <Box display="flex" gap={2}>
                    <TextField
                      label="문장 입력 (예: 고양이는 귀엽다, 강아지도 귀엽다 / 귀여워요)"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      fullWidth
                    />
                    <Button variant="contained" onClick={onAdd}>추가</Button>
                  </Box>

                  <Typography sx={{ mt: 2 }} variant="body2" color="text.secondary">
                    단어 수: {Object.keys(counts).length} · 버전: {version} · 모양: {shape ?? "원본"}
                  </Typography>
                  <Typography sx={{ mt: 1 }} variant="caption" color="text.secondary">
                    * 이 페이지는 입력만 합니다. 출력은 /display 페이지에서 보세요.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}
