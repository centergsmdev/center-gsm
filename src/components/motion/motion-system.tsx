"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "motion/react";

import { cn } from "@/lib/utils";

const premiumEase = [0.22, 1, 0.36, 1] as const;

export const motionDurations = {
  reveal: 0.55,
  hover: 0.2,
} as const;

export const motionStagger = {
  interval: 0.105,
  delay: 0.06,
} as const;

export const motionViewport = {
  once: true,
  amount: 0.32,
} as const;

const createRevealVariants = ({
  x = 0,
  y = 0,
  scale = 1,
}: {
  x?: number;
  y?: number;
  scale?: number;
}): Variants => ({
  hidden: { opacity: 0, x, y, scale },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: { duration: motionDurations.reveal, ease: premiumEase },
  },
});

const fadeVariants = createRevealVariants({});
const fadeUpVariants = createRevealVariants({ y: 24 });
const fadeLeftVariants = createRevealVariants({ x: 24 });
const fadeRightVariants = createRevealVariants({ x: -24 });
const scaleVariants = createRevealVariants({ scale: 0.975 });

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDurations.reveal, ease: premiumEase },
  },
};

function revealProps(reducedMotion: boolean | null) {
  return {
    initial: reducedMotion ? "visible" : "hidden",
    whileInView: "visible",
    viewport: motionViewport,
  } as const;
}

type RevealProps = HTMLMotionProps<"div"> & { delay?: number };

function Reveal({
  variants,
  delay = 0,
  transition,
  ...props
}: RevealProps & { variants: Variants }) {
  const reducedMotion = useReducedMotion();
  return (
    <m.div
      {...revealProps(reducedMotion)}
      variants={variants}
      transition={{ delay, ...transition }}
      {...props}
    />
  );
}

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

export function FadeIn(props: RevealProps) {
  return <Reveal variants={fadeVariants} {...props} />;
}

export function FadeUp(props: RevealProps) {
  return <Reveal variants={fadeUpVariants} {...props} />;
}

export function FadeLeft(props: RevealProps) {
  return <Reveal variants={fadeLeftVariants} {...props} />;
}

export function FadeRight(props: RevealProps) {
  return <Reveal variants={fadeRightVariants} {...props} />;
}

export function ScaleIn(props: RevealProps) {
  return <Reveal variants={scaleVariants} {...props} />;
}

export function RevealSection({
  children,
  ...props
}: HTMLMotionProps<"section">) {
  const reducedMotion = useReducedMotion();
  return (
    <m.section
      {...revealProps(reducedMotion)}
      variants={fadeUpVariants}
      {...props}
    >
      {children}
    </m.section>
  );
}

export const ViewportObserver = FadeUp;

export function StaggerContainer({
  children,
  ...props
}: HTMLMotionProps<"div">) {
  const reducedMotion = useReducedMotion();
  const variants: Variants = {
    hidden: {},
    visible: {
      transition: reducedMotion
        ? { staggerChildren: 0 }
        : {
            delayChildren: motionStagger.delay,
            staggerChildren: motionStagger.interval,
          },
    },
  };
  return (
    <m.div {...revealProps(reducedMotion)} variants={variants} {...props}>
      {children}
    </m.div>
  );
}

export function StaggerItem(props: HTMLMotionProps<"div">) {
  return <m.div variants={staggerItemVariants} {...props} />;
}

export function AnimatedCard({ className, ...props }: HTMLMotionProps<"div">) {
  const reducedMotion = useReducedMotion();
  return (
    <m.div
      variants={staggerItemVariants}
      whileHover={
        reducedMotion
          ? undefined
          : {
              y: -3,
              scale: 1.006,
              transition: {
                duration: motionDurations.hover,
                ease: premiumEase,
              },
            }
      }
      className={cn(
        "motion-card-shell rounded-[var(--home-premium-radius)] will-change-transform",
        className,
      )}
      {...props}
    />
  );
}

export function AnimatedHeading(props: RevealProps) {
  return <FadeUp {...props} />;
}

export function AnimatedImage(props: RevealProps) {
  return <ScaleIn {...props} />;
}

export type MotionSystemProps = ComponentPropsWithoutRef<typeof FadeUp>;
