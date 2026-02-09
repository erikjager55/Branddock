import {
  Target,
  Eye,
  Heart,
  Compass,
  Handshake,
  BookOpen,
  FileText,
} from "lucide-react";
import { AssetType } from "@/types/brand-asset";

interface AssetTypeIconProps {
  type: AssetType;
  className?: string;
}

export function AssetTypeIcon({ type, className }: AssetTypeIconProps) {
  const icons: Record<AssetType, typeof Target> = {
    MISSION: Target,
    VISION: Eye,
    VALUES: Heart,
    POSITIONING: Compass,
    PROMISE: Handshake,
    STORY: BookOpen,
    OTHER: FileText,
  };

  const Icon = icons[type] || FileText;
  return <Icon className={className} />;
}
