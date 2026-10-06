// Adapted from Opensource UI "Team Member" (MIT, Copyright (c) 2026 Bidyut Kundu).
// Source: https://opensourceui.in/components/team-member
// Full license: packages/ui/LICENSES/opensourceui.txt.
import { GithubLogoIcon, LinkedinLogoIcon, UserIcon, XLogoIcon } from "@phosphor-icons/react/ssr";
import { buttonVariants } from "@ambar/ui/components/button";
import { cn } from "@ambar/ui/lib/utils";

export type TeamMemberSocialLink = {
  platform: "x" | "linkedin" | "github";
  href: string;
};

export type TeamMemberCardProps = {
  name: string;
  role: string;
  imageSrc?: string;
  imageAlt?: string;
  socialLinks: TeamMemberSocialLink[];
  className?: string;
};

const SOCIAL_ICONS = { x: XLogoIcon, linkedin: LinkedinLogoIcon, github: GithubLogoIcon };

const SOCIAL_LABELS = { x: "X", linkedin: "LinkedIn", github: "GitHub" };

export function TeamMemberCard({ name, role, imageSrc, imageAlt, socialLinks, className }: TeamMemberCardProps) {
  return (
    <article
      data-slot="team-member-card"
      className={cn("group relative isolate aspect-7/9 w-full max-w-80 overflow-hidden rounded-2xl bg-sky ring-1 ring-foreground/10", className)}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={imageAlt ?? `Portrait of ${name}`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover transition-transform duration-200 ease-out-soft motion-reduce:transform-none motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
        />
      ) : (
        <div role="img" aria-label={`Portrait placeholder for ${name}`} className="absolute inset-0 grid place-items-center">
          <UserIcon weight="fill" aria-hidden className="size-40 text-ink/20" />
        </div>
      )}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/95 via-ink/30 to-transparent" />
      {socialLinks.length > 0 && (
        <nav aria-label={`${name}'s social profiles`} className="absolute top-4 right-4 flex gap-2">
          {socialLinks.map((link) => {
            const Icon = SOCIAL_ICONS[link.platform];

            return (
              <a
                key={link.platform}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${SOCIAL_LABELS[link.platform]} profile of ${name}`}
                className={buttonVariants({ tone: "cloud", size: "icon", className: "size-11" })}
              >
                <Icon weight="bold" aria-hidden />
              </a>
            );
          })}
        </nav>
      )}
      <div className="absolute right-0 bottom-0 left-0 flex flex-col gap-2 p-6">
        <p className="text-xs font-medium tracking-widest text-cloud/85 uppercase">{role}</p>
        <h3 className="text-2xl leading-tight text-cloud">{name}</h3>
      </div>
    </article>
  );
}
