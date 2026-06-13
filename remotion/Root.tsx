import React from "react";
import { Composition } from "remotion";
import {
  RecapComposition,
  RECAP_DURATION,
  RECAP_FPS,
  RECAP_WIDTH,
  RECAP_HEIGHT,
} from "../app/(app)/recap/_components/RecapComposition";
import { SAMPLE_RECAP } from "./sample-data";

export const RECAP_COMPOSITION_ID = "WeeklyRecap";

export function RemotionRoot() {
  return (
    <Composition
      id={RECAP_COMPOSITION_ID}
      component={RecapComposition}
      durationInFrames={RECAP_DURATION}
      fps={RECAP_FPS}
      width={RECAP_WIDTH}
      height={RECAP_HEIGHT}
      defaultProps={{ data: SAMPLE_RECAP, summary: null as string | null }}
    />
  );
}
