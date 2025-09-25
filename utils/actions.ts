'use server';

import { createServerClientForRoutes } from "@/utils/supabase/server";
import { Provider } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";

interface AuthResponse {
    status: string;
    description: string;
}

const signInWithProvider = (provider: Provider) => async() => {
    const supabase = await createServerClientForRoutes();

    const baseUrl = process.env.SITE_URL || 'http://localhost:3000';
    const auth_callback_url = `${baseUrl}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
            redirectTo: auth_callback_url,
        }
    })

    if (error) {
        logger.error("actions", "Sign-in error", { error: error.message });
    }
    else {
        logger.info("actions", "Sign-in success");
    }

    if (data.url) {
        redirect(data.url);
    } else {
        logger.error("actions", "Sign-in error: No URL returned");
    }
}

const signInWithMagicLink = async (formData: FormData): Promise<AuthResponse> => {
    const supabase = await createServerClientForRoutes();
    
    const email = formData.get("email") as string;

    const baseUrl = process.env.SITE_URL || 'http://localhost:3000';
    const auth_callback_url = `${baseUrl}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
            emailRedirectTo: auth_callback_url,
        }
    });

    if (error) {
        return { status: "error", description: error.message };
    }
    else {
        return { status: "success", description: "Check your email for the magic link!" };
    }

}

const signOut = async () => {
    const supabase = await createServerClientForRoutes();
    await supabase.auth.signOut();
}

const signInWithGoogle = signInWithProvider('google');

export { signInWithGoogle, signInWithMagicLink, signOut };