import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
// import monacoEditorPlugin from 'vite-plugin-monaco-editor'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // monacoEditorPlugin()
  ],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: './',
  },
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'localhost+1-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'localhost+1.pem'))
    },
    cors: {
      origin: '*',  // 允许所有源
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // 允许的方法
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],  // 允许的请求头
      credentials: true  // 允许发送 Cookie
    },
  }
})
