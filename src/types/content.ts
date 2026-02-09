export enum ContentType {
  BlogPost = "blog_post",
  SocialMedia = "social_media",
  Email = "email",
  AdCopy = "ad_copy",
  LandingPage = "landing_page",
  Video = "video",
  CaseStudy = "case_study",
  Report = "report",
  Webinar = "webinar",
}

export const contentTypeLabels: Record<ContentType, string> = {
  [ContentType.BlogPost]: "Blog Post",
  [ContentType.SocialMedia]: "Social Media",
  [ContentType.Email]: "Email",
  [ContentType.AdCopy]: "Ad Copy",
  [ContentType.LandingPage]: "Landing Page",
  [ContentType.Video]: "Video",
  [ContentType.CaseStudy]: "Case Study",
  [ContentType.Report]: "Report",
  [ContentType.Webinar]: "Webinar",
};

export enum ContentStatus {
  Draft = "draft",
  InProgress = "in_progress",
  InReview = "in_review",
  Published = "published",
  Planned = "planned",
}

export const contentStatusLabels: Record<ContentStatus, string> = {
  [ContentStatus.Draft]: "Draft",
  [ContentStatus.InProgress]: "In Progress",
  [ContentStatus.InReview]: "In Review",
  [ContentStatus.Published]: "Published",
  [ContentStatus.Planned]: "Planned",
};

export const contentStatusVariants: Record<
  ContentStatus,
  "default" | "info" | "warning" | "success"
> = {
  [ContentStatus.Draft]: "default",
  [ContentStatus.InProgress]: "info",
  [ContentStatus.InReview]: "warning",
  [ContentStatus.Published]: "success",
  [ContentStatus.Planned]: "default",
};
