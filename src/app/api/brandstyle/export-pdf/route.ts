import { NextResponse } from "next/server";

export async function POST() {
  console.log("TODO: PDF export — feature under development");
  return NextResponse.json({
    data: { url: null, message: "PDF export is coming soon" },
  });
}
