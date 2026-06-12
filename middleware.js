import { NextResponse } from 'next/server'

// Middleware doet niets meer — auth wordt per pagina client-side afgehandeld
export function middleware(request) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
