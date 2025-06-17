import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

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
                    cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
                },
            },
        },
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname

    console.log("Middleware - Session check:", {
        pathname,
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        timestamp: new Date().toISOString(),
        cookies: request.cookies.getAll().map((c) => ({ name: c.name, hasValue: !!c.value })),
    })

    // Allow access to setup pages without authentication
    if (pathname.startsWith("/setup") || pathname === "/") {
        return supabaseResponse
    }

    // If user is not signed in and trying to access protected routes
    if (!user && pathname !== "/login") {
        console.log("Middleware - No user, redirecting to login")
        const url = request.nextUrl.clone()
        url.pathname = "/login"
        return NextResponse.redirect(url)
    }

    // If user is signed in and trying to access login page, redirect to dashboard
    if (user && pathname === "/login") {
        console.log("Middleware - User found, redirecting to dashboard")
        const url = request.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
