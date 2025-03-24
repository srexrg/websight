import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
export const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS(request: NextRequest) {
    return NextResponse.json({}, { headers: corsHeaders });
}


export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const res = await req.json();
    const { domain, url, event, source } = res;
    if (!url.includes(domain))
        return NextResponse.json(
            {
                error:
                    "the script points to a different domain than the current url.",
            },
            { headers: corsHeaders }
        );

    if (event == "session_start") {

        await supabase
            .from("visits")
            .insert([{ website_id: domain, source: source ?? "Direct" }])
            .select();
    }

    if (event == "pageview") {
        await supabase.from("page_views").insert([{ domain, page: url }]);
    }
    return NextResponse.json({ res }, { headers: corsHeaders });
}