/* eslint-disable @typescript-eslint/no-unused-vars */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'


const protectedRoutes = ['/dashboard', '/gallery', '/settings', '/website'];


export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const currentRoute = request.nextUrl.pathname;

  if (currentRoute.startsWith('/auth') && user) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  if (currentRoute == "/" && user) {
    const redirectUrl = new URL(request.url);
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  if (protectedRoutes.some(route => currentRoute.startsWith(route)) && !user) {
    const redirectUrl = new URL(request.url)
    redirectUrl.pathname = '/auth';
    return NextResponse.redirect(redirectUrl);
  }


  return supabaseResponse
}