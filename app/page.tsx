import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-left space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Hey Techyon!
          </h1>
          <div className="text-lg text-muted-foreground leading-relaxed">
            <p>
              This is a pre-release version of Compile that currently only supports AI-related sources.
            </p>
            <p className="mt-4">
              Take a look and give us your feedback! You may encounter some bugs along the way...
            </p>
          </div>
        </div>
        
        <div className="pt-8">
          <Link 
            href="/home"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
