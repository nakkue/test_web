import React, { useState, useEffect } from "react";
import {
  Box, CssBaseline, Divider, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Card, CardContent,
  Grid, TextField, Button
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { TagCloud } from "react-tagcloud"; // ✅ 워드클라우드 컴포넌트

const drawerWidth = 240;    

const menuItems = [  
  { text: "전체", icon: <DashboardIcon /> }  // ✅ 대시보드 아이콘
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

  const [wordData, setWordData] = useState<{ value: string; count: number }[]>([]);
  const [userWords, setUserWords] = useState<{ value: string; count: number }[]>([]);
  const [inputWord, setInputWord] = useState<string>("");

  // ✅ 감정 사전 단어 클라우드 데이터 불러오기
  useEffect(() => {  
    fetch("/emotion_freq.json")  // ✅ 감정 단어 데이터 파일 경로
      .then((res) => res.json())   
      .then((data) => {    
        const formatted = Object.entries(data).map(([word, count]) => ({    
          value: word,    
          count: Number(count),   
        }));
        setWordData(formatted);  
      });
  }, []);   

  // ✅ 입력 단어 추가    
  const handleAddWord = () => {           
    const trimmed = inputWord.trim();         
    if (!trimmed) return;  // 빈 문자열은 추가하지 않음  

    const updated = [...userWords];         
    const existing = updated.find((item) => item.value === trimmed);  
    if (existing) {  
      existing.count += 1;  
    } else {    
      updated.push({ value: trimmed, count: 1 });  
    }  
    setUserWords(updated);  
    setInputWord("");  
  };    

  // ✅ 로그 스케일로 변환된 클라우드 데이터
  const scaledWords = userWords.map((item) => ({  
    value: item.value,  
    count: Math.log2(item.count + 1)  // 로그 스케일 적용  
  }));    

  const renderDashboard = () => (   
    <>
      <Typography variant="h5" mb={3}>전체</Typography>   
      <Grid container spacing={3}>    
        {/* ✅ 감정 단어 클라우드 */}   
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
                  <TagCloud minSize={14} maxSize={50} tags={wordData} />    
                ) : (   
                  "감정 단어를 불러오는 중..."    
                )}
              </Box>    
            </CardContent>
          </Card>
        </Grid>

        {/* ✅ 사용자 입력 단어 클라우드 */}
        <Grid item xs={12}>  
          <Card>  
            <CardContent>  
              <Typography variant="h6" mb={2}>직접 입력한 단어 클라우드</Typography>    
              <Box display="flex" gap={2} mb={2}>   
                <TextField    
                  label="단어 입력"   
                  value={inputWord}   
                  onChange={(e) => setInputWord(e.target.value)}  
                  fullWidth 
                />
                <Button variant="contained" onClick={handleAddWord}>추가</Button> 
              </Box>  

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
                  <TagCloud minSize={14} maxSize  ={80} tags={scaledWords} />
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
