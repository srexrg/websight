const steps = [
  {
    number: 1,
    title: "Add our script",
    description: "Copy and paste a single line of code to your website"
  },
  {
    number: 2,
    title: "Configure tracking",
    description: "Select the events and metrics you want to monitor"
  },
  {
    number: 3,
    title: "View insights",
    description: "Access your analytics dashboard in real-time"
  }
];

export function HowItWorksSection() {
  return (
    <section className="py-24 px-8 bg-gradient-to-b from-white to-blue-50 dark:from-background dark:to-blue-950/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">How it Works</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {steps.map((step) => (
            <div key={step.number} className="space-y-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 p-6 bg-black/5 dark:bg-white/5 rounded-lg max-w-2xl mx-auto font-mono text-sm">
          <code>{`<script src="https://websight.io/tracker.js" data-site="YOUR-SITE-ID"></script>`}</code>
        </div>
      </div>
    </section>
  );
}