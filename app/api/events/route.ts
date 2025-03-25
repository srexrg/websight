import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utils/cors";

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req:NextRequest) {
  try {
    const supabase = await createClient();
    const authHeader = (await headers()).get("authorization");
    const { name, domain, description } = await req.json();
    
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid API" },
        { status: 401, headers: corsHeaders }
      );
    }

    const apiKey = authHeader.split("Bearer ")[1];
    const { data: users, error: userError } = await supabase
      .from("users")
      .select()
      .eq("api", apiKey)

    if (userError || users.length === 0) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid API Key" },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!name?.trim() || !domain?.trim()) {
      return NextResponse.json(
        { error: "name or domain fields must not be empty." },
        { headers: corsHeaders }
      );
    }

    const { error: eventError } = await supabase
      .from("events")
      .insert([
        {
          event_name: name.toLowerCase(),
          website_id: domain,
          message: description,
        }
      ]);

    if (eventError) {
      return NextResponse.json(
        { error: eventError.message },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { message: "success" },
      { headers: corsHeaders }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}