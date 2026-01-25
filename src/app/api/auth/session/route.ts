import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
