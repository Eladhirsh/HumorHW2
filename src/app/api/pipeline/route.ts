import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.almostcrackd.ai";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user and their JWT
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", session.user.id)
    .single();
  if (!profile?.is_superadmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = session.access_token;
  const { flavorId, imageBase64, imageMime, imageAdditionalContext } =
    await req.json();

  if (!flavorId || !imageBase64 || !imageMime) {
    return NextResponse.json(
      { error: "flavorId, imageBase64, and imageMime are required" },
      { status: 400 },
    );
  }

  const steps: {
    step: string;
    status: "success" | "error";
    detail: string;
    durationMs: number;
  }[] = [];

  try {
    // Step 1: Generate presigned upload URL
    let presignedUrl: string;
    let cdnUrl: string;
    {
      const start = Date.now();
      const resp = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentType: imageMime }),
      });
      const durationMs = Date.now() - start;

      if (!resp.ok) {
        const errText = await resp.text();
        steps.push({
          step: "Generate presigned URL",
          status: "error",
          detail: `HTTP ${resp.status}: ${errText}`,
          durationMs,
        });
        return NextResponse.json({ steps, captions: [] });
      }

      const data = await resp.json();
      presignedUrl = data.presignedUrl;
      cdnUrl = data.cdnUrl;
      steps.push({
        step: "Generate presigned URL",
        status: "success",
        detail: cdnUrl,
        durationMs,
      });
    }

    // Step 2: Upload image bytes to presigned URL
    {
      const start = Date.now();
      const imageBuffer = Buffer.from(imageBase64, "base64");
      const resp = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": imageMime },
        body: imageBuffer,
      });
      const durationMs = Date.now() - start;

      if (!resp.ok) {
        const errText = await resp.text();
        steps.push({
          step: "Upload image",
          status: "error",
          detail: `HTTP ${resp.status}: ${errText}`,
          durationMs,
        });
        return NextResponse.json({ steps, captions: [] });
      }

      steps.push({
        step: "Upload image",
        status: "success",
        detail: "Image uploaded to S3",
        durationMs,
      });
    }

    // Step 3: Register image URL with the pipeline
    let imageId: string;
    {
      const start = Date.now();
      const resp = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: cdnUrl,
          isCommonUse: false,
          additionalContext: imageAdditionalContext || undefined,
        }),
      });
      const durationMs = Date.now() - start;

      if (!resp.ok) {
        const errText = await resp.text();
        steps.push({
          step: "Register image",
          status: "error",
          detail: `HTTP ${resp.status}: ${errText}`,
          durationMs,
        });
        return NextResponse.json({ steps, captions: [] });
      }

      const data = await resp.json();
      imageId = data.imageId;
      steps.push({
        step: "Register image",
        status: "success",
        detail: `Image ID: ${imageId}`,
        durationMs,
      });
    }

    // Step 4: Generate captions
    let captions: unknown[] = [];
    {
      const start = Date.now();
      const body: Record<string, unknown> = { imageId };
      if (flavorId) {
        body.humorFlavorId = flavorId;
      }
      const resp = await fetch(`${API_BASE}/pipeline/generate-captions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const durationMs = Date.now() - start;

      if (!resp.ok) {
        const errText = await resp.text();
        steps.push({
          step: "Generate captions",
          status: "error",
          detail: `HTTP ${resp.status}: ${errText}`,
          durationMs,
        });
        return NextResponse.json({ steps, captions: [] });
      }

      captions = await resp.json();
      steps.push({
        step: "Generate captions",
        status: "success",
        detail: `${Array.isArray(captions) ? captions.length : 0} captions generated`,
        durationMs,
      });
    }

    return NextResponse.json({ steps, captions });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    steps.push({
      step: "Pipeline error",
      status: "error",
      detail: message,
      durationMs: 0,
    });
    return NextResponse.json({ steps, captions: [] });
  }
}
