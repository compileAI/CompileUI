import AutomationPage from "@/components/AutomationPage";

interface AutomationPageProps {
  params: Promise<{ cardNumber: string }>;
}

export default async function Automation({ params }: AutomationPageProps) {
  const { cardNumber } = await params;
  const cardNum = parseInt(cardNumber);

  if (isNaN(cardNum) || cardNum < 0 || cardNum > 5) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Automation</h1>
          <p className="text-muted-foreground">Automation number must be between 1 and 6.</p>
        </div>
      </div>
    );
  }

  return <AutomationPage cardNumber={cardNum} />;
} 