'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KitchenLoginRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/login');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </div>
    );
}
