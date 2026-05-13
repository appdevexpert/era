import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

import {
  getSupabaseConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config"

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-era-pathname", request.nextUrl.pathname)
  requestHeaders.set("x-era-search", request.nextUrl.search)

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (!isSupabaseConfigured) {
    return response
  }

  const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig()

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value)
        })
      },
    },
  })

  await supabase.auth.getClaims()

  return response
}
