import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevation?: "sm" | "md" | "lg";
};

export function Card({ elevation, className, ...props }: CardProps) {
  const elevClass = elevation ? `elev-${elevation}` : undefined;
  return (
    <div className={["card", elevClass, className].filter(Boolean).join(" ")} {...props} />
  );
}

export function CardKicker(props: HTMLAttributes<HTMLDivElement>) {
  return <div className="card-kicker" {...props} />;
}

export function CardTitle(props: HTMLAttributes<HTMLDivElement>) {
  return <div className="card-title" {...props} />;
}

export function CardBody(props: HTMLAttributes<HTMLParagraphElement>) {
  return <p className="card-body" {...props} />;
}

export function CardMeta(props: HTMLAttributes<HTMLDivElement>) {
  return <div className="card-meta" {...props} />;
}
