import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    title: "Real-time Analytics",
    description: "See your website performance as it happens with live updates"
  },
  {
    title: "Custom Events",
    description: "Track specific user interactions and conversions that matter to you"
  },
  {
    title: "Easy Integration",
    description: "Add analytics to your site with just a few lines of code"
  },
  {
    title: "Privacy First",
    description: "No cookies, no personal data collection, fully GDPR compliant"
  }
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Features that matter</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="transform transition-all hover:scale-105">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}