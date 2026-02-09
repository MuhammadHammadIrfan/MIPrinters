import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;

        if (!token) {
            return NextResponse.json({ authenticated: false });
        }

        try {
            // Decode and parse the token
            const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());

            // Check if token has expired
            if (tokenData.exp && tokenData.exp < Date.now()) {
                // Token expired, clear it
                cookieStore.delete('auth-token');
                return NextResponse.json({ authenticated: false });
            }

            // Require sessionVersion in token - reject old tokens without it
            if (!tokenData.sessionVersion) {
                console.log('[Session] Token missing sessionVersion, rejecting');
                cookieStore.delete('auth-token');
                return NextResponse.json({
                    authenticated: false,
                    reason: 'token_outdated'
                });
            }

            console.log('[Session] Token has sessionVersion:', tokenData.sessionVersion);

            // Validate session version against database
            // This ensures sessions are invalidated when password changes
            if (tokenData.id) {
                const supabase = await createClient();
                const { data: currentVersion, error } = await supabase.rpc('get_session_version', {
                    owner_id: tokenData.id,
                });

                console.log('[Session] DB session version:', currentVersion, 'Error:', error?.message);

                if (error) {
                    console.error('Failed to validate session version:', error);
                    // On error, allow the session to continue (graceful degradation)
                } else if (currentVersion !== null && currentVersion !== tokenData.sessionVersion) {
                    // Session version mismatch - password was changed, invalidate session
                    console.log('[Session] Version mismatch! Token:', tokenData.sessionVersion, 'DB:', currentVersion);
                    cookieStore.delete('auth-token');
                    return NextResponse.json({
                        authenticated: false,
                        reason: 'session_invalidated'
                    });
                }
            }

            return NextResponse.json({
                authenticated: true,
                user: {
                    id: tokenData.id,
                    email: tokenData.email,
                    businessName: tokenData.businessName,
                },
            });
        } catch {
            // Invalid token, clear it
            cookieStore.delete('auth-token');
            return NextResponse.json({ authenticated: false });
        }
    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json({ authenticated: false });
    }
}
