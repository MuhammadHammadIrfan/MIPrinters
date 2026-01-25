import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { currentPassword, newPassword } = await request.json();

        // Validate input
        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Current password and new password are required' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'New password must be at least 6 characters' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Get the owner email (single user system)
        const { data: owner, error: ownerError } = await supabase
            .from('owner_profile')
            .select('email')
            .single();

        if (ownerError || !owner) {
            return NextResponse.json(
                { error: 'Owner profile not found' },
                { status: 404 }
            );
        }

        // Call the database function to update password
        // This function verifies the old password and updates to the new one
        const { data, error } = await supabase.rpc('update_owner_password', {
            input_email: owner.email,
            old_password: currentPassword,
            new_password: newPassword,
        });

        if (error) {
            console.error('Password update error:', error);
            return NextResponse.json(
                { error: 'Failed to update password' },
                { status: 500 }
            );
        }

        // The function returns true if successful, false if old password is wrong
        if (data === false) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Password change error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
