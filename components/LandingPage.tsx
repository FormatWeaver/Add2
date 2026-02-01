
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { landingPageCopy } from './v2.5/landingPageCopy';
import { AnimatedMockup } from './AnimatedMockup';
import { 
    ClockIcon, 
    XCircleIcon, 
    FrownIcon, 
    UploadCloudIcon, 
    BotMessageSquareIcon, 
    UserCheckIcon, 
    FileCheck2Icon, 
    ShieldCheckIcon,
    SparklesIcon,
    AlertTriangleIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    DocumentChartBarIcon,
    ListBulletIcon,
    // Fix: Added missing icon import for the FeaturesSection
    ArrowsRightLeftIcon
} from './icons';

const MotionSection = motion.section as any;
const MotionDiv = motion.div as any;
const MotionP = motion.p as any;

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
  offscreen: { y: 30, opacity: 0 },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", bounce: 0.3, duration: 0.8 }
  }
};

interface HeroSectionProps {
  data: typeof landingPageCopy.heroSection;
  onCTAClick: () => void;
  onDemoClick: () => void;
}

const HeroSection = ({ data, onCTAClick, onDemoClick }: HeroSectionProps) => (
  <section className="relative bg-slate-50 py-20 md:py-32 overflow-hidden border-b border-slate-200">
    <div className="absolute top-0 left-0 w-full h-full opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #2563eb 1px, transparent 1px), linear-gradient(to bottom, #2563eb 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
    <div className="container mx-auto px-4 relative z-10">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        <div className="text-center lg:text-left">
          <MotionDiv 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-xs font-black uppercase tracking-widest mb-6 inline-block">
              V2.5 Engineering Release
            </span>
            <h1 className="text-4xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {data.headline.split(',')[0]}<span className="text-brand-600">, {data.headline.split(',')[1]}</span>
            </h1>
            <p className="mt-8 max-w-xl mx-auto lg:mx-0 text-lg md:text-xl text-slate-600 leading-relaxed">
              {data.subHeadline}
            </p>
          </MotionDiv>
          
          <MotionDiv 
            className="mt-12 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button 
                onClick={onCTAClick} 
                className="w-full sm:w-auto px-10 py-5 bg-brand-600 text-white font-black uppercase tracking-widest rounded-xl shadow-2xl hover:bg-brand-700 transition-all hover:-translate-y-1 active:translate-y-0"
            >
              {data.primaryCTA.text}
            </button>
            <button 
                onClick={onDemoClick} 
                className="w-full sm:w-auto px-10 py-5 bg-white text-slate-700 font-bold uppercase tracking-widest rounded-xl shadow-md border border-slate-200 hover:bg-slate-50 transition-all"
            >
              Explore Logic
            </button>
          </MotionDiv>

          <MotionDiv 
            className="mt-10 flex items-center justify-center lg:justify-start gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <img 
                    key={i}
                    className="h-10 w-10 rounded-full border-2 border-white object-cover" 
                    src={`https://i.pravatar.cc/150?u=acc${i}`} 
                    alt="User"
                />
              ))}
            </div>
            <div className="text-left">
                <div className="flex gap-0.5 text-amber-400">
                    {[...Array(5)].map((_, i) => <SparklesIcon key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-1">{data.socialProof}</p>
            </div>
          </MotionDiv>
        </div>
        
        <MotionDiv
          className="relative"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="absolute inset-0 bg-brand-500/10 blur-3xl rounded-full -z-10"></div>
          <AnimatedMockup />
        </MotionDiv>
      </div>
    </div>
  </section>
);

const PainSection = ({ data }: { data: typeof landingPageCopy.painSection }) => (
  <MotionSection
    className="bg-white py-32"
    initial="offscreen"
    whileInView="onscreen"
    viewport={{ once: true, amount: 0.2 }}
  >
    <div className="container mx-auto px-4 text-center">
      <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">{data.headline}</h2>
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
        {data.painPoints.map((point, idx) => {
          const IconComponent = icons[point.icon as keyof typeof icons];
          return (
            <MotionDiv
              key={point.title}
              variants={cardVariants}
              className="group p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-2xl hover:border-brand-200 transition-all duration-300"
            >
              <div className="h-14 w-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-6 group-hover:bg-brand-50 group-hover:border-brand-200 group-hover:scale-110 transition-all">
                {IconComponent && <IconComponent className="h-7 w-7 text-slate-400 group-hover:text-brand-600" strokeWidth={2} />}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">{point.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm md:text-base">{point.description}</p>
            </MotionDiv>
          );
        })}
      </div>
    </div>
  </MotionSection>
);

const FeaturesSection = ({ data }: { data: typeof landingPageCopy.featuresSection }) => (
    <section className="bg-slate-900 py-32 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%)' }}></div>
        <div className="container mx-auto px-4 text-center relative z-10">
            <MotionDiv 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-20"
            >
                <h2 className="text-3xl md:text-5xl font-black tracking-tight">{data.headline}</h2>
                <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed">{data.subHeadline}</p>
            </MotionDiv>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                {data.features.map((feature, idx) => (
                    <MotionDiv
                      key={feature.name}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-4 mb-6">
                            {idx === 0 && <CheckCircleIcon className="h-6 w-6 text-brand-400" />}
                            {idx === 1 && <ArrowsRightLeftIcon className="h-6 w-6 text-brand-400" />}
                            {idx === 2 && <ListBulletIcon className="h-6 w-6 text-brand-400" />}
                            <span className="text-xs font-black uppercase tracking-widest text-brand-400">{feature.useCase}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-brand-300 transition-colors">{feature.name}</h3>
                        <p className="text-slate-400 leading-relaxed mb-6">{feature.description}</p>
                    </MotionDiv>
                ))}
            </div>
        </div>
    </section>
);

const HowItWorksSection = ({ data }: { data: typeof landingPageCopy.howItWorksSection }) => (
    <section className="bg-slate-50 py-32 border-b border-slate-200">
        <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">{data.headline}</h2>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">{data.subHeadline}</p>
            
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-16 relative">
                {/* Connector line for desktop */}
                <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-slate-200 -z-0"></div>
                
                {data.steps.map((step, idx) => {
                  const IconComponent = icons[step.icon as keyof typeof icons];
                  return (
                    <MotionDiv
                      key={step.step}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.2 }}
                      className="relative z-10 flex flex-col items-center"
                    >
                        <div className="w-24 h-24 rounded-full bg-white border-4 border-slate-50 shadow-xl flex items-center justify-center mb-8 group hover:scale-110 transition-transform">
                             <div className="absolute -top-2 -right-2 bg-brand-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-lg">
                                {step.step}
                             </div>
                             {IconComponent && <IconComponent className="h-10 w-10 text-brand-600" />}
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-4">{step.title}</h3>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-xs">{step.description}</p>
                    </MotionDiv>
                  );
                })}
            </div>
        </div>
    </section>
);

interface BetaProgramSectionProps {
  data: typeof landingPageCopy.betaProgramSection;
}

const BetaProgramSection = React.forwardRef<HTMLElement, BetaProgramSectionProps>(({ data }, ref) => (
  <section ref={ref} className="bg-white py-32 relative overflow-hidden">
    <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row">
            <div className="lg:w-1/2 p-12 lg:p-20 text-left">
                <span className="px-3 py-1 bg-brand-500/20 text-brand-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block">
                    Limited Access Beta
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">{data.headline}</h2>
                <p className="mt-8 text-lg text-slate-400 leading-relaxed">{data.body}</p>
                
                <div className="mt-12 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <ShieldCheckIcon className="h-6 w-6 text-brand-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-300">Stateless Encryption standard</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <UserCheckIcon className="h-6 w-6 text-brand-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-300">Dedicated Success Manager</p>
                    </div>
                </div>
            </div>
            
            <div className="lg:w-1/2 bg-slate-800/50 p-12 lg:p-20 border-l border-white/5">
                <h3 className="text-2xl font-bold text-white mb-8">{data.finalCTA.formHeader}</h3>
                <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); alert('Beta request received.') }}>
                    {data.finalCTA.formFields.map(field => (
                        <div key={field}>
                            <input 
                                type={field.includes('Email') ? 'email' : 'text'} 
                                placeholder={field}
                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white/10 transition-all text-sm font-medium" 
                            />
                        </div>
                    ))}
                    <button className="w-full py-5 bg-brand-600 text-white font-black uppercase tracking-widest rounded-xl shadow-2xl hover:bg-brand-500 transition-all mt-4">
                        {data.finalCTA.buttonText}
                    </button>
                    <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest mt-6">
                        {data.securityNote.text}
                    </p>
                </form>
            </div>
        </div>
    </div>
  </section>
));
BetaProgramSection.displayName = "BetaProgramSection";

const Footer = ({ data }: { data: typeof landingPageCopy.footer }) => (
  <footer className="bg-slate-50 py-12 border-t border-slate-200">
    <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{data.text}</p>
      <div className="flex gap-8">
        <a href="#" className="text-xs font-bold text-slate-500 hover:text-brand-600 uppercase tracking-widest">Privacy</a>
        <a href="#" className="text-xs font-bold text-slate-500 hover:text-brand-600 uppercase tracking-widest">Terms</a>
        <a href="#" className="text-xs font-bold text-slate-500 hover:text-brand-600 uppercase tracking-widest">Security</a>
      </div>
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
    <div className="bg-white">
      <HeroSection data={landingPageCopy.heroSection} onCTAClick={handleScrollToBetaFromHero} onDemoClick={onNavigateToHowItWorks} />
      <PainSection data={landingPageCopy.painSection} />
      <FeaturesSection data={landingPageCopy.featuresSection} />
      <HowItWorksSection data={landingPageCopy.howItWorksSection} />
      <BetaProgramSection ref={betaRef} data={landingPageCopy.betaProgramSection} />
      <Footer data={landingPageCopy.footer} />
    </div>
  );
}
