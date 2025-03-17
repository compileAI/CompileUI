'use client';
import { Button } from "@/components/ui/button";
import { signInWithGithub, signInWithGoogle, signInWithMagicLink } from "@/utils/actions";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import EmailValidator from "email-validator";


const AuthForm = () => {
    const [email, setEmail] = useState<string>('');
    const [alert, setAlert] = useState<{ status: string, description: string } | null>(null);

    const handleMagicLinkSignIn = async (formData: FormData) => {
        const email = formData.get("email") as string;
        if (!EmailValidator.validate(email)) {
            setAlert({ status: "error", description: "Invalid email address" });
        }
        else {
            const response = await signInWithMagicLink(formData);
            setAlert(response);
        }
    };

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
            <form className="flex flex-col gap-4 items-center">
                <Input 
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full mb-5"
                />
                <Button variant="outline" formAction={handleMagicLinkSignIn} className="w-full">
                    <img
                        src="/supabase-logo-icon.png"
                        alt="Supabase"
                        className="w-5 h-5" />
                    <span>Sign in with MagicLink</span>
                </Button>
                <Button formAction={signInWithGoogle}>
                    <FcGoogle size={20}/>
                    <span>Sign In with Google</span>
                </Button>
                <Button formAction={signInWithGithub}>
                    <FaGithub size={20}></FaGithub>
                    <span>Sign In with Github</span>
                </Button>
            </form>
        </div>
    )
};


export default AuthForm;