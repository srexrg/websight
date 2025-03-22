import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const plans = {
  monthly: [
    {
      title: "Free",
      price: "$0",
      features: [
        "Up to 10,000 pageviews",
        "Basic analytics",
        "7 days data retention"
      ],
      buttonText: "Get Started",
      buttonVariant: "default"
    },
    {
      title: "Pro",
      price: "$29",
      features: [
        "Up to 100,000 pageviews",
        "Custom events",
        "30 days data retention",
        "API access"
      ],
      buttonText: "Upgrade to Pro",
      buttonVariant: "default",
      highlighted: true
    },
    {
      title: "Enterprise",
      price: "Custom",
      features: [
        "Unlimited pageviews",
        "Advanced analytics",
        "Unlimited data retention",
        "Priority support"
      ],
      buttonText: "Contact Sales",
      buttonVariant: "outline"
    }
  ]
};

export function PricingSection() {
  return (
    <section className="py-24 px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Simple, transparent pricing</h2>
        <Tabs defaultValue="monthly" className="max-w-3xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px] mx-auto mb-8">
            <TabsTrigger value="monthly">Monthly billing</TabsTrigger>
            <TabsTrigger value="yearly">Yearly billing</TabsTrigger>
          </TabsList>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.monthly.map((plan) => (
              <TabsContent value="monthly" key={plan.title}>
                <Card className={plan.highlighted ? "border-blue-600" : ""}>
                  <CardHeader>
                    <CardTitle>{plan.title}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold">{plan.price}</span> /month
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full mt-6" 
                      variant={plan.buttonVariant as "default" | "outline"}
                    >
                      {plan.buttonText}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
}