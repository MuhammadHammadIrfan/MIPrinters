import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Call the login_owner function which bypasses RLS
        const { data, error } = await supabase.rpc('login_owner', {
            input_email: email,
            plain_password: password,
        });

        if (error) {
            console.error('Login RPC error:', error);
            return NextResponse.json(
                { error: 'Failed to verify credentials' },
                { status: 500 }
            );
        }

        // Check if login was successful
        if (!data || !data.success) {
            return NextResponse.json(
                { error: data?.error || 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Create auth token (base64 encoded JSON with expiry and session version)
        const tokenData = {
            id: data.user.id,
            email: data.user.email,
            businessName: data.user.businessName,
            sessionVersion: data.user.sessionVersion || 1, // Include session version for invalidation
            exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        };
        const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');

        // Set HTTP-only cookie
        const cookieStore = await cookies();
        cookieStore.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
            path: '/',
        });

        // Return success with owner info
        return NextResponse.json({
            success: true,
            user: data.user,
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
