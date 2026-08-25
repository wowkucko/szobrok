import { NextResponse } from "next/server";
import { getJobStatus } from "@/lib/blogSync";

/** Futó és ütemezett blog-folyamatok állapota (admin panelnek). */
export async function GET() {
  return NextResponse.json(getJobStatus());
}
