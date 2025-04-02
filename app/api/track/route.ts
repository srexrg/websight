import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utils/cors";
import { UAParser } from "ua-parser-js";

// Custom error types for better error handling
class DatabaseError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'DatabaseError';
    }
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

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

        // Validate required fields
        if (!payload.domain || !payload.url) {
            throw new ValidationError('Missing required fields: domain and url are required');
        }

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

        // Validate event type
        if (!['session_start', 'pageview'].includes(event)) {
            throw new ValidationError('Invalid event type');
        }

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
            
            // First check if this visitor has already visited today
            const { data: existingVisit, error: visitCheckError } = await supabase
                .from("visits")
                .select("visitor_id")
                .eq("website_id", domain)
                .eq("visitor_id", visitor_id)
                .gte("created_at", new Date().toISOString().split('T')[0])
                .single();

            if (visitCheckError && visitCheckError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw new DatabaseError(`Failed to check existing visit: ${visitCheckError.message}`, 'VISIT_CHECK_ERROR');
            }

            const isNewVisitor = !existingVisit;

            // Insert the visit
            const { error: visitError } = await supabase.from("visits").insert([{
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

            if (visitError) {
                throw new DatabaseError(`Failed to insert visit: ${visitError.message}`, 'VISIT_INSERT_ERROR');
            }
            console.log('Session start tracked');

            const today = new Date().toISOString().split('T')[0];
            console.log('Updating daily stats for session start...');
            const { data: existingStats, error: statsError } = await supabase
                .from("daily_stats")
                .select()
                .eq("domain", domain)
                .eq("date", today)
                .single();

            if (statsError && statsError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw new DatabaseError(`Failed to fetch daily stats: ${statsError.message}`, 'STATS_FETCH_ERROR');
            }

            if (existingStats) {
                console.log('Existing stats found, updating...');
                const { error: updateError } = await supabase
                    .from("daily_stats")
                    .update({
                        visits: existingStats.visits + 1,
                        unique_visitors: isNewVisitor ? existingStats.unique_visitors + 1 : existingStats.unique_visitors
                    })
                    .eq("domain", domain)
                    .eq("date", today);

                if (updateError) {
                    throw new DatabaseError(`Failed to update daily stats: ${updateError.message}`, 'STATS_UPDATE_ERROR');
                }
                console.log('Daily stats updated');
            } else {
                console.log('No existing stats found, inserting new stats...');
                const { error: insertError } = await supabase
                    .from("daily_stats")
                    .insert({
                        domain,
                        date: today,
                        visits: 1,
                        unique_visitors: 1,
                        page_views: 0
                    });

                if (insertError) {
                    throw new DatabaseError(`Failed to insert daily stats: ${insertError.message}`, 'STATS_INSERT_ERROR');
                }
                console.log('New daily stats inserted');
            }
        }

        if (event === "pageview") {
            console.log('Tracking page view...');
            const { error: pageViewError } = await supabase.from("page_views").insert([{
                domain,
                page: path || url,
                visitor_id,
                session_id,
                device_type: deviceType,
                os: osInfo.name,
                country: countryCode
            }]);

            if (pageViewError) {
                throw new DatabaseError(`Failed to insert page view: ${pageViewError.message}`, 'PAGEVIEW_INSERT_ERROR');
            }
            console.log('Page view tracked');

            const today = new Date().toISOString().split('T')[0];
            console.log('Updating daily stats for page view...');
            const { data: existingStats, error: statsError } = await supabase
                .from("daily_stats")
                .select()
                .eq("domain", domain)
                .eq("date", today)
                .single();

            if (statsError && statsError.code !== 'PGRST116') {
                throw new DatabaseError(`Failed to fetch daily stats: ${statsError.message}`, 'STATS_FETCH_ERROR');
            }

            if (existingStats) {
                console.log('Existing stats found, updating...');
                const { error: updateError } = await supabase
                    .from("daily_stats")
                    .update({
                        page_views: existingStats.page_views + 1
                    })
                    .eq("domain", domain)
                    .eq("date", today);

                if (updateError) {
                    throw new DatabaseError(`Failed to update daily stats: ${updateError.message}`, 'STATS_UPDATE_ERROR');
                }
                console.log('Daily stats updated');
            } else {
                console.log('No existing stats found, inserting new stats...');
                const { error: insertError } = await supabase
                    .from("daily_stats")
                    .insert({
                        domain,
                        date: today,
                        visits: 0,
                        unique_visitors: 0,
                        page_views: 1
                    });

                if (insertError) {
                    throw new DatabaseError(`Failed to insert daily stats: ${insertError.message}`, 'STATS_INSERT_ERROR');
                }
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
        
        // Handle specific error types
        if (error instanceof ValidationError) {
            return NextResponse.json(
                { error: error.message },
                { status: 400, headers: corsHeaders }
            );
        }
        
        if (error instanceof DatabaseError) {
            return NextResponse.json(
                { error: "Database operation failed", code: error.code },
                { status: 500, headers: corsHeaders }
            );
        }

        // Handle unknown errors
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500, headers: corsHeaders }
        );
    }
}