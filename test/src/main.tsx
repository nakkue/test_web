import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App2 from './App2'       // 입력 전용
import Output from './Output'   // 출력 전용
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App2 />} />
        <Route path="/display" element={<Output />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
