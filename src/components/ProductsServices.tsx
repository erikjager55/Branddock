import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { PageHeader } from './ui/PageHeader';
import { EmptyState } from './ui/EmptyState';
import { Stack } from './ui/Stack';
import { Grid } from './ui/Grid';
import { Container } from './ui/Container';
import { Flex } from './ui/Flex';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Users,
  Target,
  Smartphone,
  Zap,
  Globe,
  X,
  Link2,
  FileText,
  Upload,
  PenTool,
} from 'lucide-react';
import { useProducts } from '../contexts';
import { useProductPersonas, useUnlinkPersona } from '../contexts/ProductsContext';
import type { ProductPersonaLink } from '../lib/api/products';

interface ProductsServicesProps {
  onNavigate?: (section: string, productId?: string) => void;
}

// ─── Source badge config ─────────────────────────────────────
function getSourceConfig(source?: string) {
  switch (source?.toUpperCase()) {
    case 'URL':
    case 'WEBSITE':
      return { icon: Globe, label: 'URL', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'PDF':
    case 'FILE':
      return { icon: FileText, label: 'PDF', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    case 'UPLOAD':
      return { icon: Upload, label: 'Upload', color: 'bg-violet-100 text-violet-700 border-violet-200' };
    default:
      return { icon: PenTool, label: 'Manual', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  }
}

// ─── Persona tags sub-component ──────────────────────────────
function PersonaTags({ productId }: { productId: string }) {
  const { data, isLoading } = useProductPersonas(productId);
  const unlinkMutation = useUnlinkPersona();
  const personas = data?.personas ?? [];

  if (isLoading) return null;
  if (personas.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic flex items-center gap-1">
        <Users className="h-3 w-3" />
        No personas linked
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {personas.slice(0, 3).map((p) => (
        <span
          key={p.id}
          className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 pl-1 pr-2 py-0.5 text-xs text-violet-700 group/tag"
        >
          <span className="h-4 w-4 rounded-full bg-violet-200 flex items-center justify-center flex-shrink-0 text-[10px] font-semibold uppercase">
            {p.name.charAt(0)}
          </span>
          <span className="truncate max-w-[80px]">{p.name}</span>
          <button
            className="h-3 w-3 rounded-full hover:bg-violet-300 flex items-center justify-center opacity-0 group-hover/tag:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              unlinkMutation.mutate({ productId, personaId: p.id });
            }}
            title="Unlink persona"
          >
            <X className="h-2 w-2" />
          </button>
        </span>
      ))}
      {personas.length > 3 && (
        <span className="inline-flex items-center rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs text-violet-600">
          +{personas.length - 3}
        </span>
      )}
    </div>
  );
}

export function ProductsServices({ onNavigate }: ProductsServicesProps) {
  const { products } = useProducts();

  const getIcon = (category: string) => {
    switch (category) {
      case 'Software': return Package;
      case 'Mobile': return Smartphone;
      case 'Consulting': return Zap;
      case 'Transformation': return Globe;
      default: return Package;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[#1FD1B2]/10 text-[#1FD1B2] border-[#1FD1B2]/30';
      case 'beta': return 'bg-[#5252E3]/10 text-[#5252E3] border-[#5252E3]/30';
      case 'deprecated': return 'bg-[#FF6B48]/10 text-[#FF6B48] border-[#FF6B48]/30';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'Product' 
      ? 'bg-[#5252E3]/10 text-[#5252E3] border-[#5252E3]/30'
      : 'bg-[#FECFBD]/40 text-[#FF6B48] border-[#FECFBD]';
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header - Using master component */}
      <PageHeader
        icon={Package}
        iconGradient="primary"
        title="Products & Services"
        subtitle="Manage your product catalog and service offerings"
        actions={
          <Button 
            size="lg" 
            className="gap-2"
            onClick={() => onNavigate?.('product-analyzer')}
          >
            <Plus className="h-5 w-5" />
            Add Product/Service
          </Button>
        }
      />

      {/* Content - Using Container and Grid for auto layout */}
      <Container maxWidth="xl" paddingX="md" paddingY="md">
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nog geen producten of diensten"
            description="Voeg je eerste product of dienst toe om te beginnen"
            {...{
              action: (
                <Button onClick={() => onNavigate?.('product-analyzer')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Product/Service Toevoegen
                </Button>
              )
            } as any}
          />
        ) : (
          <Grid cols={2} gap="lg">
            {products.map((product) => {
              const Icon = getIcon(product.category);
              const pricingDisplay = product.pricing?.amount || product.pricing?.model || 'Custom';
              
              return (
                <Card 
                  key={product.id} 
                  className="rounded-xl border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer group"
                  onClick={() => onNavigate?.('product-detail', product.id)}
                >
                  <CardHeader className="pb-4">
                    <Flex align="start" justify="between">
                      <Flex align="start" gap="3" className="flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <Stack direction="vertical" gap="xs" className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                            {product.name}
                          </CardTitle>
                          <CardDescription>
                            {product.category} • {pricingDisplay}
                          </CardDescription>
                        </Stack>
                      </Flex>
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </Flex>
                  </CardHeader>
                  <CardContent>
                    <Stack direction="vertical" gap="md">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>

                      {/* Persona tags */}
                      {product.id && (
                        <div className="flex items-center gap-2">
                          <PersonaTags productId={product.id} />
                        </div>
                      )}

                      {product.features && product.features.length > 0 && (
                        <Stack direction="vertical" gap="sm">
                          <h4 className="text-sm font-medium">Key Features:</h4>
                          <Flex wrap gap="1.5">
                            {product.features.slice(0, 4).map((feature, index) => (
                              <Badge key={index} variant="outline" className="text-xs rounded-md">
                                {feature}
                              </Badge>
                            ))}
                            {product.features.length > 4 && (
                              <Badge variant="outline" className="text-xs rounded-md bg-muted">
                                +{product.features.length - 4} meer
                              </Badge>
                            )}
                          </Flex>
                        </Stack>
                      )}

                      {/* Source badge */}
                      {(() => {
                        const srcConfig = getSourceConfig(product.source);
                        const SrcIcon = srcConfig.icon;
                        return (
                          <div className="flex items-center pt-2 border-t border-border/50">
                            <Badge variant="outline" className={`text-[10px] gap-1 px-2 py-0.5 ${srcConfig.color}`}>
                              <SrcIcon className="h-3 w-3" />
                              {srcConfig.label}
                            </Badge>
                          </div>
                        );
                      })()}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Grid>
        )}
      </Container>
    </div>
  );
}