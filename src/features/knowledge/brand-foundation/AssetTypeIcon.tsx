import { Image, Palette, Type, MessageSquare, FileText } from "lucide-react";
import { AssetType } from "@/types/brand-asset";

interface AssetTypeIconProps {
  type: AssetType;
  className?: string;
}

export function AssetTypeIcon({ type, className }: AssetTypeIconProps) {
  const icons = {
    LOGO: Image,
    COLOR: Palette,
    TYPOGRAPHY: Type,
    MESSAGING: MessageSquare,
    GUIDELINE: FileText,
  };

  const Icon = icons[type];
  return <Icon className={className} />;
}
