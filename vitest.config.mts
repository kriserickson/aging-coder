import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    root: path.resolve(import.meta.dirname, "cv"),
    test: {
        environment: "jsdom",
        include: ["tests/**/*.test.ts"],
    },
});
