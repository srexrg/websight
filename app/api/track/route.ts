import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utils/cors";
import { UAParser } from "ua-parser-js";

// Function to get device type
function getDeviceType(userAgent: string) {
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const deviceType = device.type?.toLowerCase() || "";

    if (deviceType.includes("mobile")) return "mobile";
    if (deviceType.includes("tablet")) return "tablet";
    return "desktop";
}

// Function to get OS info
function getOSInfo(userAgent: string) {
    const parser = new UAParser(userAgent);
    const os = parser.getOS();
    return {
        name: os.name || "Unknown"
    };
}

// Get country info from headers
function getCountryInfo(req: NextRequest) {
    // Check various headers from different CDNs and edge providers
    const cfCountry = req.headers.get("cf-ipcountry");
    const vercelCountry = req.headers.get("x-vercel-ip-country");
    const fastlyCountry = req.headers.get("Fastly-Geo-Country");
    const cloudfrontCountry = req.headers.get("CloudFront-Viewer-Country");

    // Use the first available country code, or default to "XX" for unknown
    return cfCountry || vercelCountry || fastlyCountry || cloudfrontCountry || "XX";
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const payload = await req.json();
        const { 
            domain, 
            url, 
            path,
            event, 
            utm, 
            source,
            user_agent,
            visitor_id, 
            session_id,
            screen,
            language
        } = payload;

        if (!url.includes(domain)) {
            return NextResponse.json(
                { error: "Domain mismatch error" },
                { headers: corsHeaders }
            );
        }

        // Check if domain exists
        const { data: domainExists } = await supabase
            .from("domains")
            .select("id")
            .eq("domain", domain)
            .single();

        if (!domainExists) {
            return NextResponse.json(
                { error: "Domain not registered" },
                { headers: corsHeaders }
            );
        }

        const deviceType = user_agent ? getDeviceType(user_agent) : "desktop";
        const osInfo = user_agent ? getOSInfo(user_agent) : { name: "Unknown" };
        const countryCode = getCountryInfo(req);
        const sourceName = source || utm?.medium || utm?.source || "direct";

        // Log analytics data
        console.log("==== ANALYTICS EVENT ====");
        console.log("Event Type:", event);
        console.log("Domain:", domain);
        console.log("URL:", url);
        console.log("Path:", path);
        console.log("Visitor ID:", visitor_id);
        console.log("Session ID:", session_id);
        console.log("Country:", countryCode);
        console.log("Device Type:", deviceType);
        console.log("OS:", osInfo.name);
        console.log("Source:", sourceName);
        console.log("Screen:", screen);
        console.log("Language:", language);
        console.log("UTM Parameters:", utm);
        console.log("========================");

        // Track visit data
        if (event === "session_start") {
            await supabase.from("visits").insert([{
                website_id: domain,
                source: sourceName,
                visitor_id,
                session_id,
                device_type: deviceType,
                os: osInfo.name,
                country: countryCode,
                screen_width: screen?.width,
                screen_height: screen?.height,
                language,
                utm_source: utm?.source,
                utm_medium: utm?.medium,
                utm_campaign: utm?.campaign
            }]);

            // Update analytics aggregates
            const today = new Date().toISOString().split('T')[0];
            const { data: existingStats } = await supabase
                .from("daily_stats")
                .select()
                .eq("domain", domain)
                .eq("date", today)
                .single();

            if (existingStats) {
                await supabase
                    .from("daily_stats")
                    .update({
                        visits: existingStats.visits + 1,
                        unique_visitors: existingStats.unique_visitors + 1
                    })
                    .eq("domain", domain)
                    .eq("date", today);
            } else {
                await supabase
                    .from("daily_stats")
                    .insert({
                        domain,
                        date: today,
                        visits: 1,
                        unique_visitors: 1,
                        page_views: 0
                    });
            }
        }

        // Track page views
        if (event === "pageview") {
            await supabase.from("page_views").insert([{
                domain,
                page: path || url,
                visitor_id,
                session_id,
                device_type: deviceType,
                os: osInfo.name,
                country: countryCode
            }]);

            // Update page view count
            const today = new Date().toISOString().split('T')[0];
            const { data: existingStats } = await supabase
                .from("daily_stats")
                .select()
                .eq("domain", domain)
                .eq("date", today)
                .single();

            if (existingStats) {
                await supabase
                    .from("daily_stats")
                    .update({
                        page_views: existingStats.page_views + 1
                    })
                    .eq("domain", domain)
                    .eq("date", today);
            } else {
                await supabase
                    .from("daily_stats")
                    .insert({
                        domain,
                        date: today,
                        visits: 0,
                        unique_visitors: 0,
                        page_views: 1
                    });
            }
        }

        return NextResponse.json(
            { success: true, event: event },
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json(
            { error: "Failed to process analytics" },
            { status: 500, headers: corsHeaders }
        );
    }
}