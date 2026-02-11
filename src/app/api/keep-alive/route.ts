import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // 1. Security Check
    const authHeader = request.headers.get('authorization');
    const keyParam = request.nextUrl.searchParams.get('key');
    const validSecret = process.env.CRON_SECRET;

    // Check if the secret matches either the bearer token or the query param
    const isValid =
        (authHeader && authHeader === `Bearer ${validSecret}`) ||
        (keyParam && keyParam === validSecret);

    if (!validSecret || !isValid) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    // 2. Keep Supabase Alive
    try {
        const supabase = await createClient();

        // Simple query to wake up the database
        // We select 1 row from customers, just to trigger a read
        const { data, error } = await supabase
            .from('customers')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Keep-alive query error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                status: 'ok',
                message: 'Database checked successfully',
                timestamp: new Date().toISOString()
            },
            { status: 200 }
        );
    } catch (err) {
        console.error('Keep-alive unhandled error:', err);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
