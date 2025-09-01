



import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { landingPageCopy } from './v2.5/landingPageCopy';
import { AnimatedMockup } from './AnimatedMockup';
import { ClockIcon } from './icons/ClockIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { FrownIcon } from './icons/FrownIcon';
import { UploadCloudIcon } from './icons/UploadCloudIcon';
import { BotMessageSquareIcon } from './icons/BotMessageSquareIcon';
import { UserCheckIcon } from './icons/UserCheckIcon';
import { FileCheck2Icon } from './icons/FileCheck2Icon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

const MotionSection = motion.section as any;
const MotionDiv = motion.div as any;

const icons = {
  Clock: ClockIcon,
  XCircle: XCircleIcon,
  Frown: FrownIcon,
  UploadCloud: UploadCloudIcon,
  BotMessageSquare: BotMessageSquareIcon,
  UserCheck: UserCheckIcon,
  FileCheck2: FileCheck2Icon
};

const cardVariants: any = {
  offscreen: { y: 50, opacity: 0 },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", bounce: 0.4, duration: 0.8 }
  }
};

interface HeroSectionProps {
  data: typeof landingPageCopy.heroSection;
  onCTAClick: () => void;
  onDemoClick: () => void;
}

const HeroSection = ({ data, onCTAClick, onDemoClick }: HeroSectionProps) => (
  <section className="relative hero-section-bg pt-8 pb-16 md:pt-12 md:pb-24">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">{data.headline}</h1>
          <p className="mt-6 max-w-xl mx-auto lg:mx-0 text-lg md:text-xl text-slate-600">{data.subHeadline}</p>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button onClick={onCTAClick} className="w-full sm:w-auto px-8 py-4 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200 text-lg animate-pulse-subtle">
              {data.primaryCTA.text}
            </button>
            <button onClick={onDemoClick} className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 font-semibold rounded-lg shadow-sm border border-slate-300 hover:bg-slate-50 transition-all duration-200">
              See How It Works
            </button>
          </div>
           <div className="mt-8 flex items-center justify-center lg:justify-start">
                <div className="flex -space-x-3 overflow-hidden">
                    <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User 1"/>
                    <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1550525811-e58691053ba4?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User 2"/>
                    <img className="inline-block h-10 w-10 rounded-full ring-2 ring-white" src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User 3"/>
                </div>
                <p className="ml-4 text-sm font-semibold text-slate-600">{data.socialProof}</p>
            </div>
        </div>
        <MotionDiv
          className="hidden lg:block"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          <AnimatedMockup />
        </MotionDiv>
      </div>
    </div>
  </section>
);

const PainSection = ({ data }: { data: typeof landingPageCopy.painSection }) => (
  <MotionSection
    className="bg-white py-20"
    initial="offscreen"
    whileInView="onscreen"
    viewport={{ once: true, amount: 0.2 }}
    transition={{ staggerChildren: 0.2 }}
  >
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{data.headline}</h2>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        {data.painPoints.map(point => {
          const IconComponent = icons[point.icon as keyof typeof icons];
          return (
            <MotionDiv
              key={point.title}
              variants={cardVariants}
              className="bg-slate-50 p-8 rounded-xl border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-brand-600">
                {IconComponent && <IconComponent width={40} height={40} strokeWidth={1.5} />}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-800">{point.title}</h3>
              <p className="mt-2 text-slate-600">{point.description}</p>
            </MotionDiv>
          );
        })}
      </div>
    </div>
  </MotionSection>
);

const HowItWorksSection = ({ data }: { data: typeof landingPageCopy.howItWorksSection }) => (
    <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{data.headline}</h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">{data.subHeadline}</p>
            <MotionDiv
              className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12 text-left"
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ staggerChildren: 0.15 }}
            >
                {data.steps.map(step => {
                  const IconComponent = icons[step.icon as keyof typeof icons];
                  return (
                    <MotionDiv
                      key={step.step}
                      variants={cardVariants}
                      className="relative"
                    >
                        <div className="flex items-center gap-x-4">
                            <div className="flex-shrink-0 w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center text-xl font-bold">{step.step}</div>
                            <div className="text-brand-600">
                                {IconComponent && <IconComponent width={32} height={32} strokeWidth={1.5} />}
                            </div>
                        </div>
                         <h3 className="mt-4 text-xl font-semibold text-slate-800">{step.title}</h3>
                        <p className="mt-2 text-slate-600">{step.description}</p>
                    </MotionDiv>
                );
                })}
            </MotionDiv>
        </div>
    </section>
);

const FeaturesSection = ({ data }: { data: typeof landingPageCopy.featuresSection }) => (
    <section className="bg-white py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">{data.headline}</h2>
             <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">{data.subHeadline}</p>
            <MotionDiv
              className="mt-12 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 text-left"
              initial="offscreen"
              whileInView="onscreen"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ staggerChildren: 0.2 }}
            >
                {data.features.map(feature => (
                    <MotionDiv
                      key={feature.name}
                      variants={cardVariants}
                      className="feature-card bg-white p-8 rounded-xl shadow-lg border border-slate-200 flex flex-col"
                    >
                        <h3 className="text-xl font-bold text-slate-800">{feature.name}</h3>
                        <p className="mt-4 text-slate-600 flex-grow">{feature.description}</p>
                        <div className="mt-6 pt-4 border-t border-slate-200">
                            <span className="text-sm font-semibold text-brand-600">{feature.useCase}</span>
                        </div>
                    </MotionDiv>
                ))}
            </MotionDiv>
        </div>
    </section>
);

interface BetaProgramSectionProps {
  data: typeof landingPageCopy.betaProgramSection;
}

const BetaProgramSection = React.forwardRef<HTMLElement, BetaProgramSectionProps>(({ data }, ref) => (
  <section ref={ref} className="bg-gradient-to-br from-brand-600 to-brand-800 py-20">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-white">{data.headline}</h2>
      <p className="mt-6 max-w-3xl mx-auto text-lg text-brand-100">{data.body}</p>
      <div className="mt-10 bg-white/95 backdrop-blur-sm p-8 rounded-xl shadow-2xl max-w-2xl mx-auto">
        <h3 className="text-2xl font-bold text-slate-800">{data.finalCTA.formHeader}</h3>
        <form className="mt-8 space-y-4 text-left">
          {data.finalCTA.formFields.map(field => (
            <div key={field}>
              <label htmlFor={field.toLowerCase().replace(/\s/g, '')} className="block text-sm font-medium text-slate-700">{field}</label>
              <input type={field.includes('Email') ? 'email' : 'text'} id={field.toLowerCase().replace(/\s/g, '')} placeholder={`Your ${field}`} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-accent-500 focus:border-accent-500 sm:text-sm" />
            </div>
          ))}
          <button type="submit" onClick={(e) => { e.preventDefault(); alert('Beta request submitted (simulation).') }} className="w-full px-6 py-3 mt-4 bg-brand-600 text-white font-semibold rounded-lg shadow-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200 text-lg">
            {data.finalCTA.buttonText}
          </button>
        </form>
      </div>
      <div className="mt-8 flex items-center justify-center space-x-3 text-brand-200">
        <ShieldCheckIcon className="h-5 w-5" />
        <p className="font-semibold">{data.securityNote.text}</p>
      </div>
    </div>
  </section>
));
BetaProgramSection.displayName = "BetaProgramSection";

const Footer = ({ data }: { data: typeof landingPageCopy.footer }) => (
  <footer className="bg-slate-50 py-8">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <p className="text-sm text-slate-500">{data.text}</p>
    </div>
  </footer>
);

interface LandingPageProps {
  scrollToBeta?: boolean;
  onDidScroll?: () => void;
  onNavigateToHowItWorks: () => void;
}

export default function LandingPage({ scrollToBeta, onDidScroll, onNavigateToHowItWorks }: LandingPageProps) {
  const betaRef = useRef<HTMLElement>(null);

  const handleScrollToBetaFromHero = () => {
    betaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    if (scrollToBeta && betaRef.current) {
      betaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (onDidScroll) {
        onDidScroll();
      }
    }
  }, [scrollToBeta, onDidScroll]);

  return (
    <div>
      <HeroSection data={landingPageCopy.heroSection} onCTAClick={handleScrollToBetaFromHero} onDemoClick={onNavigateToHowItWorks} />
      <PainSection data={landingPageCopy.painSection} />
      <FeaturesSection data={landingPageCopy.featuresSection} />
      <HowItWorksSection data={landingPageCopy.howItWorksSection} />
      <BetaProgramSection ref={betaRef} data={landingPageCopy.betaProgramSection} />
      <Footer data={landingPageCopy.footer} />
    </div>
  );
}