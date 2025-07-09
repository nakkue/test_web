import React, { useState, useEffect } from "react";
import {
  Box, CssBaseline, Divider, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Card, CardContent,
  Grid, TextField, Button // ✅ 사용자 입력 관련 추가
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { TagCloud } from "react-tagcloud"; // ✅ 워드클라우드 컴포넌트 추가

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

function App() {
  const [selectedMenu, setSelectedMenu] = useState<string>("전체");

  const [wordData, setWordData] = useState<{ value: string; count: number }[]>([]); // ✅ JSON 감정 클라우드 데이터
  const [userWords, setUserWords] = useState<{ value: string; count: number }[]>([]); // ✅ 사용자 입력 워드클라우드
  const [inputWord, setInputWord] = useState<string>(""); // ✅ 입력창 값 상태

  // ✅ emotion_freq.json 불러오기 (처음 한 번만 실행됨)
  useEffect(() => {
    fetch("/emotion_freq.json")
      .then((res) => res.json())
      .then((data) => {
        const formatted = Object.entries(data).map(([word, count]) => ({
          value: word,
          count: Number(count),
        }));
        setWordData(formatted); // 상태로 저장
      });
  }, []);

  // ✅ 입력창 단어를 userWords 배열에 추가
  const handleAddWord = () => {
    const trimmed = inputWord.trim();
    if (!trimmed) return;

    const updated = [...userWords];
    const existing = updated.find((item) => item.value === trimmed);
    if (existing) {
      existing.count += 1; // 기존 단어는 count 증가
    } else {
      updated.push({ value: trimmed, count: 1 }); // 새 단어는 추가
    }
    setUserWords(updated);
    setInputWord(""); // 입력창 초기화
  };

  const renderDashboard = () => (
    <>
      <Typography variant="h5" mb={3}>전체</Typography>
      <Grid container spacing={3}>
        {/* ✅ 감정 사전 기반 클라우드 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>감정 단어 클라우드</Typography>
              <Box
                sx={{
                  height: 400,
                  width: "100%",
                  border: "1px dashed #ccc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                }}
              >
                {wordData.length > 0 ? (
                  <TagCloud minSize={14} maxSize={40} tags={wordData} />
                ) : (
                  "감정 단어를 불러오는 중..."
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ✅ 입력창 + 입력한 단어 클라우드 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>직접 입력한 단어 클라우드</Typography>
              {/* ✅ 입력창 & 버튼 */}
              <Box display="flex" gap={2} mb={2}>
                <TextField
                  label="단어 입력"
                  value={inputWord}
                  onChange={(e) => setInputWord(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" onClick={handleAddWord}>추가</Button>
              </Box>

              {/* ✅ 입력한 단어 클라우드 */}
              <Box
                sx={{
                  height: 400,
                  width: "100%",
                  border: "1px dashed #ccc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                }}
              >
                {userWords.length > 0 ? (
                  <TagCloud minSize={14} maxSize={40} tags={userWords} />
                ) : (
                  "아직 입력된 단어가 없어요"
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
// ✅ App 컴포넌트 내에 필요한 라이브러리와 컴포넌트들을 import 했습니다.
// ✅ 감정 단어 클라우드와 사용자 입력 단어 클라우드를 구현했습니다.
// ✅ 감정 단어는 emotion_freq.json에서 불러오고, 사용자 입력 단어는 입력창을 통해 추가할 수 있습니다.
// ✅ 입력한 단어는 상태로 관리되며, 중복 입력 시 count가 증가합니다.
