'use client';
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const AuthForm = () => {
    const [alert, setAlert] = useState<{ status: string, description: string } | null>(null);
    const supabase = createClient();

    useEffect(() => {
        if (alert) {
            const duration = 5000;
            const timeout = setTimeout(() => {
                setAlert(null);
            }, duration);
            return () => {
                clearTimeout(timeout);
            };
        }
    }, [alert]);

    return (
        <div>
            {alert && (
                <div className="fixed top-4 left-4">
                    <Alert>
                        <Terminal className='h-4 w-4' color={alert.status === "success" ? "blue" : "red"} />
                        <AlertTitle>{alert.status === "success" ? "Success" : "Error"}</AlertTitle>
                        <AlertDescription>{alert.description}</AlertDescription>
                    </Alert>
                </div>
            )}
            <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground text-center">
                    During sign-in, you'll see a Supabase URL (xxhaqkipppncfdluhffa.supabase.co) — that's our secure authentication provider.
                </p>
            </div>
            <form className="flex flex-col gap-4 items-center">
                <Button
                    className="w-full"
                    type="button"
                    onClick={async () => {
                        const { data, error } = await supabase.auth.signInWithOAuth({
                        provider: 'google',
                        options: {
                            redirectTo: `${window.location.origin}/auth/callback`,
                        },
                        });
                        if (error) {
                        setAlert({ status: "error", description: error.message });
                        } else if (data.url) {
                        window.location.href = data.url; // This will redirect the user to Google
                        }
                    }}
                >
                <FcGoogle size={20}/>
                <span>Sign In with Google</span>
                </Button>
            </form>
        </div>
    )
};


export default AuthForm;