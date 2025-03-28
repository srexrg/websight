import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    

    if (error) {
      console.error('Auth callback error:', {
        error,
        errorDescription: decodeURIComponent(errorDescription || '')
      });
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code) {
      console.error('No code provided in callback');
      return NextResponse.redirect(`${origin}/auth?error=No authorization code provided`);
    }

    const supabase = await createClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError) {
      console.error('Session error:', {
        error: sessionError,
        code
      });
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(sessionError.message)}`
      );
    }

    if (!session?.user) {
      console.error('No user in session after code exchange');
      return NextResponse.redirect(`${origin}/auth?error=No user found in session`);
    }

    // Existing user check and creation
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select()
      .eq('id', session.user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Database error:', userError);
      return NextResponse.redirect(`${origin}/auth?error=Database error`);
    }

    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata.full_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating user:', insertError);
        return NextResponse.redirect(`${origin}/auth?error=Could not create user`);
      }
    }

    return NextResponse.redirect(`${origin}/dashboard`);
  } catch (error) {
    console.error('Unexpected error in auth callback:', error);
    return NextResponse.redirect(`${origin}/auth?error=An unexpected error occurred`);
  }
}