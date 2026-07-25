import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
          throw new Error("Nicht eingeloggt.");
        }
        return {
          allowedContentTypes: [
            "image/*",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ],
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // Der Datensatz wird clientseitig direkt nach Abschluss des Uploads
        // per Server Action gespeichert (siehe document-tab.tsx).
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Upload fehlgeschlagen." },
      { status: 400 }
    );
  }
}
