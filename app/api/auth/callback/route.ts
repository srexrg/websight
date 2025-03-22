import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";


export async function GET(request: Request) {

  console.log(request.url)
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  console.log("origin",origin)
  const redirectTo = "/dashboard";

  if (code) {
    const supabase = await createClient();
    
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (sessionError ) {
      console.error('Session error:', sessionError);
      return NextResponse.redirect(`${origin}/auth?error=Could not sign in`);
    }

    if (session?.user ) {
      const { data: existingUser, error: userError  } = await supabase
        .from('users')
        .select()
        .eq('id', session.user.id)
        .single();

      if (userError && userError.code !== 'PGRST116' ) {
        console.error('Database error:', userError);
        return NextResponse.redirect(`${origin}/auth?error=Database error`);
      }

      if (!existingUser  ) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email,
            full_name:session.user.user_metadata.full_name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Error creating user:', insertError);
          return NextResponse.redirect(`${origin}/auth?error=Could not create user`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}