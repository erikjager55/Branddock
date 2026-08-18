import { Skeleton, SkeletonCard, SkeletonText, SkeletonAvatar, SkeletonBadge } from 'branddock-app';

export const Basis = () => (
  <div className="max-w-md space-y-3">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
  </div>
);

export const Tekstblok = () => (
  <div className="max-w-md">
    <SkeletonText lines={4} />
  </div>
);

export const Kaart = () => (
  <div className="max-w-sm">
    <SkeletonCard />
  </div>
);

export const AvatarEnBadge = () => (
  <div className="flex items-center gap-3">
    <SkeletonAvatar />
    <SkeletonBadge />
  </div>
);
