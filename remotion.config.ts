// Remotion CLI / bundler config. Used by `remotion render`, `remotion studio`,
// and `remotion lambda sites create`. The Next.js app itself does not use this.
import { Config } from "@remotion/cli/config";
import path from "path";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");

// Resolve the "@/..." path alias the composition's type imports use, so the
// bundle matches the Next.js module graph.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      "@": path.join(process.cwd()),
    },
  },
}));
