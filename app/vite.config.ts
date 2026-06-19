import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// outDir is set to "app/dist" deliberately. Netlify is configured with
// base="app" and publish="app/dist", which it resolves to
// /opt/build/repo/app/app/dist. Vite runs with its root at the base ("app"),
// so emitting to "app/dist" puts the build output exactly at that path.
// (If the Netlify publish directory is ever simplified to "dist", change this
// back to the default "dist".)
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'app/dist',
    emptyOutDir: true,
  },
})
