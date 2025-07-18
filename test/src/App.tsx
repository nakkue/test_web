import React, { useState, useEffect } from "react";
import {
  Box, CssBaseline, Divider, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Card, CardContent,
  Grid, TextField, Button, ButtonGroup
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReactECharts from "echarts-for-react";
import "echarts-wordcloud";

const drawerWidth = 240;

const menuItems = [
  { text: "전체", icon: <DashboardIcon /> }
];

interface SidebarProps {
  selectedMenu: string;
  setSelectedMenu: (menu: string) => void;
}

function Sidebar({ selectedMenu, setSelectedMenu }: SidebarProps) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "#6B8F71",
          color: "#fff",
        },
      }}
    >
      <Toolbar>
        <Typography variant="h6">상담사 대시보드</Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map(({ text, icon }) => (
          <ListItem key={text} disablePadding>
            <ListItemButton
              selected={selectedMenu === text}
              onClick={() => setSelectedMenu(text)}
            >
              <ListItemIcon sx={{ color: "#fff" }}>{icon}</ListItemIcon>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}

// ✅ 개선된 명사/형용사 추출 함수 (1.9버전)
const extractNounsAndAdjectives = (sentence: string): string[] => {
  const tokens = sentence.split(/[\s,.!?~()\[\]'"“”‘’]+/); // 구두점 제거
  const stopwords = [
    "하다", "되다", "있다", "없다", "같다", "입니다", "그리고",
    "그러나", "저는", "제가", "너무", "정말", "그냥"
  ];

  // 조사 제거
  const removeJosa = (word: string): string =>
    word.replace(/(은|는|이|가|을|를|에|의|도|로|으로|에서|보다|께서)$/, "");

  // 조건 판단 함수
  const isValidWord = (word: string): boolean => {
    const w = removeJosa(word);
    const isHangul = /^[가-힣]+$/.test(w);
    const lenValid = w.length >= 2 && w.length <= 5;
    const notStopword = !stopwords.includes(w);
    return isHangul && lenValid && notStopword;
  };

  return tokens
    .map(removeJosa)
    .filter((word) => isValidWord(word));
};

function App() {
  const [selectedMenu, setSelectedMenu] = useState("전체");
  const [wordData, setWordData] = useState<{ name: string; value: number }[]>([]);
  const [userWords, setUserWords] = useState<{ value: string; count: number }[]>([]);
  const [inputWord, setInputWord] = useState("");
  const [shape, setShape] = useState<string | null>(null);

  const shapeOptions = [
    { label: "동그라미", value: "circle" },
    { label: "네모", value: "square" },
    { label: "별", value: "star" },
    { label: "원본", value: "original" },
  ];

  useEffect(() => {
    fetch("/emotion_freq.json")
      .then((res) => res.json())
      .then((data) => {
        if (!data || typeof data !== "object") return;

        const formatted = Object.entries(data)
          .filter(([word, count]) => typeof word === "string" && !isNaN(Number(count)))
          .map(([word, count]) => ({ name: word, value: Number(count) }));

        setWordData(formatted);
      })
      .catch((err) => console.error("감정 단어 로딩 에러:", err));
  }, []);

  const handleAddWord = () => {
    const trimmed = inputWord.trim();
    if (!trimmed) return;

    const extractedWords = extractNounsAndAdjectives(trimmed);
    const updated = [...userWords];

    extractedWords.forEach((word) => {
      const existing = updated.find((item) => item.value === word);
      if (existing) {
        existing.count += 1;
      } else {
        updated.push({ value: word, count: 1 });
      }
    });

    setUserWords(updated);
    setInputWord("");
  };

  const scaledWords = userWords.map((item) => ({
    name: item.value,
    value: Math.log2(item.count + 1),
  }));

  const getEchartsOption = (data: { name: string; value: number }[]) => {
    const baseSeries: any = {
      type: "wordCloud",
      gridSize: 8,
      sizeRange: [12, 60],
      rotationRange: [0, 0],
      textStyle: {
        fontFamily: "sans-serif",
        fontWeight: "bold",
        color: () =>
          `rgb(${Math.round(Math.random() * 160)}, ${Math.round(
            Math.random() * 160
          )}, ${Math.round(Math.random() * 160)})`,
      },
      data,
    };

    if (shape) {
      baseSeries.shape = shape;
    }

    return { series: [baseSeries] };
  };

  const renderDashboard = () => (
    <>
      <Typography variant="h5" mb={3}>전체</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>감정 단어 클라우드</Typography>
              <ButtonGroup variant="outlined" sx={{ mb: 2 }}>
                {shapeOptions.map(({ label, value }) => (
                  <Button key={value + label} onClick={() => setShape(value === "original" ? null : value)}>
                    {label}
                  </Button>
                ))}
              </ButtonGroup>
              <Box sx={{ height: 400 }}>
                {wordData.length > 0 ? (
                  <ReactECharts option={getEchartsOption(wordData)} style={{ height: 400 }} />
                ) : (
                  <Typography color="error">❌ 유효하지 않은 감정 데이터입니다.</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>직접 입력한 단어 클라우드</Typography>
              <Box display="flex" gap={2} mb={2}>
                <TextField
                  label="문장 입력"
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" onClick={handleAddWord}>추가</Button>
              </Box>
              <Box sx={{ height: 400 }}>
                {scaledWords.length > 0 ? (
                  <ReactECharts option={getEchartsOption(scaledWords)} style={{ height: 400 }} />
                ) : (
                  <Typography color="textSecondary">아직 입력된 단어가 없어요</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <Sidebar selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Box sx={{ p: 3 }}>
          <Toolbar />
          {renderDashboard()}
        </Box>
      </Box>
    </Box>
  );
}

export default App;
