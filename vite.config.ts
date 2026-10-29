import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // One stylesheet, in the order of src/styles.ts (the pages load lazily; per-chunk stylesheets would
  // change which rules win).
  build: { cssCodeSplit: false },
});
