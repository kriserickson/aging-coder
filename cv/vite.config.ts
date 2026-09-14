import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
	root: import.meta.dirname,
	build: {
		lib: {
			entry: path.resolve(import.meta.dirname, "src/index.ts"),
			name: "CVBundle",
			formats: ["iife"],
			fileName: () => "cv.js",
		},
		outDir: path.resolve(import.meta.dirname, "../assets/js"),
		emptyOutDir: false,
		sourcemap: mode === "development",
		minify: mode === "production" ? "esbuild" : false,
	},
	test: {
		environment: "jsdom",
	},
}));
