import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Is it really free to start?",
    a: "Yes — no credit card, no trial period, no gotcha. The free plan is free forever. Upgrade when you're ready to unlock AI, invoicing, and unlimited clients.",
  },
  {
    q: "How long does setup take?",
    a: "Most users are fully set up within 10 minutes. Add your clients, create your first project, and the AI handles the rest. No manual configuration or team training needed.",
  },
  {
    q: "Do my clients need to create an account?",
    a: "No — clients access their portal via a private link. No signup, no password, no friction for them.",
  },
  {
    q: "Can I import data from ClickUp or Notion?",
    a: "Yes — you can import projects and tasks via CSV. Our setup guide walks you through it step by step.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel any time in two clicks. You keep Pro access until the end of your billing period. No cancellation fees, no long-term contracts.",
  },
  {
    q: "Is my client data safe?",
    a: "All data is encrypted in transit and at rest. We use enterprise-grade Firebase infrastructure. Your client data is never shared or used for AI training.",
  },
];

interface FAQSectionProps {
  openChat?: () => void;
}

export function FAQSection({ openChat }: FAQSectionProps) {
  return (
    <section id="faq" style={{ background: "#111318", padding: "120px 0" }}>
      <div className="max-w-2xl mx-auto px-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex justify-center mb-4"
        >
          <span
            className="text-[11px] font-bold tracking-[0.12em] uppercase px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(94,106,210,0.12)",
              color: "#5E6AD2",
              border: "1px solid rgba(94,106,210,0.3)",
            }}
          >
            FAQ
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-[30px] md:text-[40px] font-medium text-[#F0F0F5] text-center mb-10"
        >
          Frequently asked questions
        </motion.h2>

        <Accordion type="single" collapsible className="space-y-2">
          {FAQS.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              <AccordionItem
                value={`faq-${i}`}
                className="border-b border-[#2A2D3A]"
              >
                <AccordionTrigger 
                  className="text-[15px] font-bold text-[#F0F0F5] text-left py-4 hover:no-underline min-h-[52px]"
                >
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-[14px] text-[#8B8FA8] pb-5 leading-[1.75]">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>

        {/* Support CTA inside the section */}
        <div className="mt-12 text-center pt-8 border-t border-[#2A2D3A]">
          <p className="text-[14px] text-[#8B8FA8] font-medium">
            Still have questions?{" "}
            <button
              onClick={openChat}
              className="text-[#5E6AD2] hover:text-[#4D59C2] font-bold hover:underline transition-all inline-flex items-center gap-1 ml-1"
            >
              Chat with us →
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
