import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    root: path.resolve(__dirname, "cv"),
    test: {
        environment: "jsdom",
        include: ["tests/**/*.test.ts"],
    },
});
