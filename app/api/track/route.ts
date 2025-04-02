import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utils/cors";
import { UAParser } from "ua-parser-js";


function getDeviceType(userAgent: string) {
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const deviceType = device.type?.toLowerCase() || "";

    if (deviceType.includes("mobile")) return "mobile";
    if (deviceType.includes("tablet")) return "tablet";
    return "desktop";
}


function getOSInfo(userAgent: string) {
    const parser = new UAParser(userAgent);
    const os = parser.getOS();
    return {
        name: os.name || "Unknown"
    };
}

function getCountryInfo(req: NextRequest) {
    const cfCountry = req.headers.get("cf-ipcountry");
    const vercelCountry = req.headers.get("x-vercel-ip-country");
    const fastlyCountry = req.headers.get("Fastly-Geo-Country");
    const cloudfrontCountry = req.headers.get("CloudFront-Viewer-Country");


    return cfCountry || vercelCountry || fastlyCountry || cloudfrontCountry || "XX";
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    try {
        console.log('=== Starting Analytics Processing ===');
        console.log('Timestamp:', new Date().toISOString());
        
        const supabase = await createClient();
        console.log('Supabase client initialized');
        
        const payload = await req.json();
        console.log('Request payload received:', JSON.stringify(payload));
        
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

        console.log('Domain validation check...');
        if (!url.includes(domain)) {
            console.warn('Domain mismatch detected:', { url, domain });
            return NextResponse.json(
                { error: "Domain mismatch error" },
                { headers: corsHeaders }
            );
        }
        console.log('Domain validation passed');

        const deviceType = user_agent ? getDeviceType(user_agent) : "desktop";
        const osInfo = user_agent ? getOSInfo(user_agent) : { name: "Unknown" };
        const countryCode = getCountryInfo(req);
        const sourceName = source || utm?.medium || utm?.source || "direct";

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

   
        if (event === "session_start") {
            console.log('Tracking session start...');
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
            console.log('Session start tracked');

            const today = new Date().toISOString().split('T')[0];
            console.log('Updating daily stats for session start...');
            const { data: existingStats } = await supabase
                .from("daily_stats")
                .select()
                .eq("domain", domain)
                .eq("date", today)
                .single();

            if (existingStats) {
                console.log('Existing stats found, updating...');
                await supabase
                    .from("daily_stats")
                    .update({
                        visits: existingStats.visits + 1,
                        unique_visitors: existingStats.unique_visitors + 1
                    })
                    .eq("domain", domain)
                    .eq("date", today);
                console.log('Daily stats updated');
            } else {
                console.log('No existing stats found, inserting new stats...');
                await supabase
                    .from("daily_stats")
                    .insert({
                        domain,
                        date: today,
                        visits: 1,
                        unique_visitors: 1,
                        page_views: 0,
                        avg_session_duration: 0,
                        bounce_rate: 0
                    });
                console.log('New daily stats inserted');
            }
        }

        if (event === "session_end") {
            console.log('Tracking session end...');
            const { duration } = payload.data;
            
            const today = new Date().toISOString().split('T')[0];
            const { data: existingStats } = await supabase
                .from("daily_stats")
                .select()
                .eq("domain", domain)
                .eq("date", today)
                .single();

            if (existingStats) {
                // Calculate new average session duration
                const currentTotalDuration = existingStats.avg_session_duration * existingStats.visits;
                console.log('Current total duration:', currentTotalDuration);
                const newTotalDuration = currentTotalDuration + duration;
                console.log('New total duration:', newTotalDuration);
                const newAvgDuration = newTotalDuration / (existingStats.visits + 1);
                console.log('New average duration:', newAvgDuration);

                await supabase
                    .from("daily_stats")
                    .update({
                        avg_session_duration: newAvgDuration
                    })
                    .eq("domain", domain)
                    .eq("date", today);
                console.log('Session duration updated');
            }
        }

        if (event === "pageview") {
            console.log('Tracking page view...');
            await supabase.from("page_views").insert([{
                domain,
                page: path || url,
                visitor_id,
                session_id,
                device_type: deviceType,
                os: osInfo.name,
                country: countryCode
            }]);
            console.log('Page view tracked');

            const today = new Date().toISOString().split('T')[0];
            console.log('Updating daily stats for page view...');
            const { data: existingStats } = await supabase
                .from("daily_stats")
                .select()
                .eq("domain", domain)
                .eq("date", today)
                .single();

            if (existingStats) {
                // Get page views for this session
                const { data: sessionPageViews } = await supabase
                    .from("page_views")
                    .select("id")
                    .eq("session_id", session_id)
                    .eq("domain", domain);

                const pageViewsInSession = sessionPageViews?.length || 0;

                // If this is the first page view in the session, it's not a bounce
                if (pageViewsInSession === 1) {
                    const currentBounces = existingStats.bounce_rate * existingStats.visits / 100;
                    console.log('Current bounces:', currentBounces);
                    const newBounceRate = (currentBounces / existingStats.visits) * 100;
                    console.log('New bounce rate:', newBounceRate);

                    await supabase
                        .from("daily_stats")
                        .update({
                            page_views: existingStats.page_views + 1,
                            bounce_rate: newBounceRate
                        })
                        .eq("domain", domain)
                        .eq("date", today);
                } else {
                    await supabase
                        .from("daily_stats")
                        .update({
                            page_views: existingStats.page_views + 1
                        })
                        .eq("domain", domain)
                        .eq("date", today);
                }
                console.log('Daily stats updated');
            } else {
                console.log('No existing stats found, inserting new stats...');
                await supabase
                    .from("daily_stats")
                    .insert({
                        domain,
                        date: today,
                        visits: 0,
                        unique_visitors: 0,
                        page_views: 1,
                        avg_session_duration: 0,
                        bounce_rate: 0
                    });
                console.log('New daily stats inserted');
            }
        }

        console.log('Analytics processing completed successfully');
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