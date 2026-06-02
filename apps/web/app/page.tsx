import { Suspense } from "react";
import {
  AuthErrorBanner,
  Backdrop,
  CostEstimation,
  FAQ,
  FinalCTA,
  Footer,
  Hero,
  HowItWorks,
  InfrastructureExamples,
  LogoStrip,
  Nav,
  Problem,
  Security,
  Solution
} from "../components/landing";

export default function LandingPage() {
  return (
    <main className="landing-root relative min-h-screen overflow-x-hidden">
      <Suspense fallback={null}>
        <AuthErrorBanner />
      </Suspense>
      <Backdrop />
      <Nav />
      <Hero />
      <LogoStrip />
      <Problem />
      <Solution />
      <HowItWorks />
      <InfrastructureExamples />
      <CostEstimation />
      <Security />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
