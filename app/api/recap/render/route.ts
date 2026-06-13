import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWeekRecap } from "@/lib/recap";
import { isRenderConfigured, getLambdaConfig, RECAP_COMPOSITION_ID } from "@/lib/recap-render";

const schema = z.object({
  week: z.number().int().max(0).default(0),
  summary: z.string().nullable().optional(),
});

// Lets the UI show the Download button as enabled or "not set up yet".
export async function GET() {
  return NextResponse.json({ configured: isRenderConfigured() });
}

// Starts a Remotion Lambda render of the weekly recap and returns the render
// handle. Poll /api/recap/render/progress with it.
export async function POST(request: NextRequest) {
  if (!isRenderConfigured()) {
    return NextResponse.json(
      { error: "Video export is not configured. Set the REMOTION_* env vars (see HANDOFF.md)." },
      { status: 503 }
    );
  }

  try {
    const { week, summary } = schema.parse(await request.json().catch(() => ({})));
    const data = await getWeekRecap(week);
    const { region, functionName, serveUrl, accessKeyId, secretAccessKey } = getLambdaConfig();

    // Imported lazily so the heavy SDK isn't bundled into other routes.
    const { renderMediaOnLambda } = await import("@remotion/lambda/client");

    const { renderId, bucketName } = await renderMediaOnLambda({
      region: region as never,
      functionName: functionName!,
      serveUrl: serveUrl!,
      composition: RECAP_COMPOSITION_ID,
      inputProps: { data, summary: summary ?? null },
      codec: "h264",
      imageFormat: "jpeg",
      downloadBehavior: {
        type: "download",
        fileName: `lifeos-recap-${data.weekStart.slice(0, 10)}.mp4`,
      },
      ...(accessKeyId && secretAccessKey
        ? { awsAccessKeyId: accessKeyId, awsSecretAccessKey: secretAccessKey }
        : {}),
    } as never);

    return NextResponse.json({ renderId, bucketName });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues }, { status: 400 });
    console.error("recap render error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
