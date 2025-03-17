import Image from "next/image";
import { createClientForServer } from "@/utils/supabase/server";
import { signOut } from "@/utils/actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClientForServer();

  const user = (await supabase.auth.getUser()).data.user;

  const { email, user_name, avatar_url } = user?.user_metadata || {};

  return (
    <div>
      <main className="flex flex-col items-center justify-center min-h-screen py-2">
        <h1 className="mb-10 font-bold text-xl">Welcome to Compile</h1>

        <div className="flex flex-col gap-4 items-center">
          {user ? (
            <div className="flex gap-4 items-center flex-col">
              {avatar_url && 
                <Image 
                  src={avatar_url} 
                  alt="User Profile Image"
                  width={200}
                  height={200}
                  ></Image>}
                <p>You are signed in as {user.email} </p>
                <form action={signOut}>
                  <Button className='cursor-pointer' type="submit">Sign out</Button>
                </form>
            </div>
          ) : (
            <Link href='/auth' passHref>
              <Button className='cursor-pointer'>Sign in</Button>
            </Link>
          )}
        </div>
      </main>
    
    </div>
  );
}
