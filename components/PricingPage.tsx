
import React, { useState } from 'react';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { motion, AnimatePresence } from 'framer-motion';

interface PricingPageProps {
    onGetStartedClick: () => void;
}

const MotionDiv = motion.div as any;

const frequencies = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annually', label: 'Annually' },
];

const tiers = [
    {
        name: "Free",
        id: "tier-free",
        price: { monthly: "$0", annually: "$0" },
        description: "For trying out the platform on small, non-critical projects.",
        features: [
            "2 downloads per month",
            "Process documents up to 600 pages",
            "Standard AI analysis",
        ],
        cta: "Start for Free",
        mostPopular: false,
    },
    {
        name: "Pro",
        id: "tier-pro",
        price: { monthly: "$12", annually: "$122" },
        description: "For solo professionals who need unlimited access and maximum power.",
        features: [
            "Unlimited downloads",
            "Unlimited document size",
            "Active Addenda Checker",
            "Store project history",
            "Priority support",
        ],
        cta: "Upgrade to Pro",
        mostPopular: true,
    },
    {
        name: "Team",
        id: "tier-team",
        price: { monthly: "$15", annually: "$153" },
        priceSuffix: "/ user",
        description: "For teams to collaborate with shared access and billing.",
        features: [
            "All Pro features",
            "Team management dashboard",
            "Centralized billing",
            "Shared project history",
            "Volume discounts available",
        ],
        cta: "Choose Team Plan",
        mostPopular: false,
    },
];

const enterpriseTier = {
    name: "Enterprise",
    id: "tier-enterprise",
    price: "Custom",
    description: "A tailored package for large organizations with specific security and integration needs.",
    features: [
        "All Team features",
        "On-premise deployment options",
        "Custom SSO integration & API access",
        "Dedicated engineering support",
        "Personalized onboarding & training"
    ],
    cta: "Contact Sales",
};


const faqs = [
    {
        id: 1,
        question: "What does 'unlimited downloads' mean?",
        answer: "On our Pro and Team plans, it means exactly that! You can download as many conformed documents, comparison reports, and summaries as you need without worrying about hitting a limit. This is designed for professionals who handle a high volume of bids.",
    },
    {
        id: 4,
        question: "What is the Active Addenda Checker?",
        answer: "This premium feature allows you to paste a URL to a project bidding site. Our AI will then use Google Search to analyze the page's content and notify you if it appears a new addendum has been released, helping you stay on top of changes without constantly refreshing pages.",
    },
    {
        id: 2,
        question: "Can I upgrade, downgrade, or cancel my plan anytime?",
        answer: "Yes! You can manage your subscription from your account dashboard. Upgrades are applied immediately, while downgrades and cancellations take effect at the end of your current billing cycle.",
    },
    {
        id: 3,
        question: "What's the difference between Pro and Team?",
        answer: "The Pro plan is designed for a single user. The Team plan allows multiple users under one account with centralized billing and a dashboard to manage team members, making it ideal for companies.",
    },
];

// Comment: Added key to FaqItemProps to fix line 256 error.
interface FaqItemProps {
    q: string;
    a: string;
    key?: React.Key;
}

const FaqItem = ({ q, a }: FaqItemProps) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 py-6">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left gap-4"
            >
                <span className="font-semibold text-lg text-slate-800">{q}</span>
                <ChevronDownIcon className={`flex-shrink-0 h-6 w-6 text-slate-500 transition-transform transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
            {isOpen && (
                <MotionDiv
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                >
                    <p className="text-slate-600 leading-relaxed">{a}</p>
                </MotionDiv>
            )}
            </AnimatePresence>
        </div>
    )
};


export const PricingPage = ({ onGetStartedClick }: PricingPageProps) => {
    const [frequency, setFrequency] = useState(frequencies[0]);

    return (
        <div className="bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                        Simple, Unlimited Pricing
                    </h1>
                    <p className="mt-6 text-lg text-slate-600">
                        Focus on winning bids, not counting credits. Choose a plan and get unlimited access to the best AI-powered conforming tool on the market.
                    </p>
                </div>
                
                <div className="mt-20 flex justify-center">
                    <div className="relative flex rounded-full p-1 bg-slate-100 text-sm font-semibold">
                         <MotionDiv
                            className="absolute -top-7 left-1/2 -translate-x-1/2 bg-accent-100 text-accent-700 text-xs font-bold py-1 px-2.5 rounded-full pointer-events-none"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                        >
                            Save 15%
                        </MotionDiv>
                         {frequencies.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setFrequency(option)}
                                className={`${
                                frequency.value === option.value ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                                } relative rounded-full py-1.5 px-6 whitespace-nowrap transition-colors focus:outline-none`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="isolate mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
                    {tiers.map((tier) => (
                        <div
                            key={tier.id}
                            className={`relative flex flex-col rounded-2xl p-8 shadow-lg ${
                                tier.mostPopular ? 'bg-white ring-2 ring-brand-500' : 'bg-slate-50 ring-1 ring-slate-200'
                            }`}
                        >
                            {tier.mostPopular && (
                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                                     <div className="rounded-full bg-brand-500 px-3.5 py-1 text-sm font-semibold text-white">
                                        Most Popular
                                    </div>
                                </div>
                            )}
                            <h3 className="text-xl font-semibold leading-7 text-slate-900">{tier.name}</h3>
                            <div className="mt-4 flex items-baseline gap-x-2">
                                <span className="text-4xl font-bold tracking-tight text-slate-900">
                                    {tier.price[frequency.value as keyof typeof tier.price]}
                                </span>
                                {tier.id !== 'tier-free' && (
                                    <span className="text-sm font-semibold leading-6 text-slate-600">
                                        {frequency.value === 'monthly' ? `/month${tier.priceSuffix || ''}` : `/year${tier.priceSuffix || ''}`}
                                    </span>
                                )}
                            </div>
                             <p className="mt-6 text-sm leading-6 text-slate-600">{tier.description}</p>
                            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-slate-600 flex-grow">
                                {tier.features.map((feature) => (
                                <li key={feature} className="flex gap-x-3">
                                    <CheckIcon className="h-6 w-5 flex-none text-brand-600" aria-hidden="true" />
                                    {feature}
                                </li>
                                ))}
                            </ul>
                            <button
                                onClick={onGetStartedClick}
                                aria-describedby={tier.id}
                                className={`mt-8 block w-full rounded-md py-2.5 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors ${
                                tier.mostPopular
                                    ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-500 focus-visible:outline-brand-600'
                                    : 'bg-white text-brand-600 ring-1 ring-inset ring-brand-200 hover:ring-brand-300 focus-visible:outline-brand-600'
                                }`}
                            >
                                {tier.cta}
                            </button>
                        </div>
                    ))}
                </div>

                 <div className="mt-16">
                    <div className="relative rounded-2xl p-8 lg:p-12 shadow-xl ring-1 ring-slate-900/10 bg-white">
                        <div className="grid lg:grid-cols-2 gap-12 items-center">
                            <div className="max-w-md">
                                <h3 className="text-3xl font-bold tracking-tight text-slate-900">{enterpriseTier.name}</h3>
                                <p className="mt-4 text-base leading-7 text-slate-600">{enterpriseTier.description}</p>
                                <button
                                    onClick={onGetStartedClick}
                                    aria-describedby={enterpriseTier.id}
                                    className="mt-8 inline-block rounded-md bg-slate-800 px-8 py-3 text-center font-semibold text-white shadow-sm hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800 transition-colors"
                                >
                                    {enterpriseTier.cta}
                                </button>
                            </div>
                            <ul role="list" className="space-y-4 text-sm font-medium text-slate-700 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4">
                                {enterpriseTier.features.map((feature) => (
                                <li key={feature} className="flex gap-x-3">
                                    <CheckIcon className="h-6 w-5 flex-none text-brand-600" aria-hidden="true" />
                                    <span>{feature}</span>
                                </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-24 max-w-4xl mx-auto">
                    <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
                        Your Questions, Answered
                    </h2>
                    <div className="mt-10">
                       {faqs.map(faq => <FaqItem key={faq.id} q={faq.question} a={faq.answer} />)}
                    </div>
                </div>
            </div>
        </div>
    );
};
