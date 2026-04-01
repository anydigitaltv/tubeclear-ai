import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is 'Reused Content' and why does it matter?",
    a: "YouTube's Repetitious Content policy targets channels that upload substantially similar videos — same format, same script, minimal variation. TubeClear's AI detects these patterns across your uploads and flags potential issues before YouTube does, protecting your monetization status.",
  },
  {
    q: "How does the AI detect AI-generated content?",
    a: "Our scanner analyzes audio patterns, visual artifacts, and metadata signals commonly associated with AI-generated voices, deepfakes, and synthetic visuals. Under 2026 YouTube policies, undisclosed AI content can trigger automatic demonetization.",
  },
  {
    q: "What is BYOK and is it safe?",
    a: "BYOK (Bring Your Own Key) means you use your own API key from providers like Gemini, OpenAI, or DeepSeek. Your key is stored locally in your browser — it never leaves your device or touches our servers.",
  },
  {
    q: "Do I need an account to use TubeClear?",
    a: "No! Basic scans are completely free and require no login. Just paste a YouTube URL and get an instant risk assessment. BYOK is only needed for deep-dive AI analysis.",
  },
  {
    q: "How does the Policy Newsroom keep my channel safe?",
    a: "Our newsroom tracks every YouTube policy update in real-time. When a new rule drops, TubeClear's AI auditor automatically adjusts its scanning criteria — no manual updates needed. You're always protected by the latest standards.",
  },
];

const FAQSection = () => {
  return (
    <section className="container mx-auto px-6 py-16 space-y-8" id="faq">
      <div className="text-center space-y-3">
        <h2 className="text-3xl md:text-4xl font-bold">
          Frequently Asked <span className="text-gradient">Questions</span>
        </h2>
      </div>

      <div className="max-w-2xl mx-auto">
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="glass-card px-5 border-none"
            >
              <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
