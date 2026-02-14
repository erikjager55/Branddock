import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Copy, 
  Check, 
  Paintbrush, 
  Type, 
  Layout, 
  Circle,
  Square,
  FileCode,
  Share2,
  Image as ImageIcon,
  Camera,
  Shapes,
  Megaphone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Tag,
  Sparkles,
  Lock,
  Unlock,
  Edit3,
  Save,
  X as XIcon,
  Plus,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { BrandStyleData } from './BrandstyleAnalyzer';

interface StyleGuideViewerProps {
  styleData: BrandStyleData;
  onBack: () => void;
}

interface NavSection {
  id: string;
  label: string;
  ref: React.RefObject<HTMLDivElement>;
}

export function StyleGuideViewer({ styleData, onBack }: StyleGuideViewerProps) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('visual-identity');
  
  // Lock and Edit state
  const [isLocked, setIsLocked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable style data (local copy)
  const [editableData, setEditableData] = useState<BrandStyleData>(styleData);

  // Section refs for navigation
  const visualIdentityRef = useRef<HTMLDivElement>(null);
  const designSystemRef = useRef<HTMLDivElement>(null);
  const contentAssetsRef = useRef<HTMLDivElement>(null);
  const brandVoiceRef = useRef<HTMLDivElement>(null);
  const technicalRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const navSections: NavSection[] = [
    { id: 'visual-identity', label: 'Visual Identity', ref: visualIdentityRef },
    { id: 'design-system', label: 'Design System', ref: designSystemRef },
    { id: 'content-assets', label: 'Content Assets', ref: contentAssetsRef },
    { id: 'brand-voice', label: 'Brand Voice', ref: brandVoiceRef },
    { id: 'technical', label: 'Technical', ref: technicalRef },
  ];

  // Generate CSS variables based on editableData
  const cssVariables = `:root {
  /* Colors */
  --color-primary: ${editableData.colors.primary};
  --color-secondary: ${editableData.colors.secondary};
  --color-accent: ${editableData.colors.accent};
  --color-text: ${editableData.colors.text};
  --color-background: ${editableData.colors.background};
  
  /* Typography */
  --font-heading: ${editableData.typography.headingFont};
  --font-body: ${editableData.typography.bodyFont};
  --font-size-h1: ${editableData.typography.fontSize.h1};
  --font-size-h2: ${editableData.typography.fontSize.h2};
  --font-size-body: ${editableData.typography.fontSize.body};
  
  /* Spacing */
  --spacing-sm: ${editableData.spacing.small};
  --spacing-md: ${editableData.spacing.medium};
  --spacing-lg: ${editableData.spacing.large};
  
  /* Border Radius */
  --radius-sm: ${editableData.borderRadius.small};
  --radius-md: ${editableData.borderRadius.medium};
  --radius-lg: ${editableData.borderRadius.large};
}`;

  const handleCopy = (text: string, itemId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Editable Color Swatch
  const EditableColorSwatch = ({ 
    color, 
    label, 
    colorKey 
  }: { 
    color: string; 
    label: string; 
    colorKey: 'primary' | 'secondary' | 'accent' | 'text' | 'background';
  }) => {
    const itemId = `color-${colorKey}`;
    const isCopied = copiedItem === itemId;

    return (
      <div className="space-y-2">
        {isEditing ? (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => setEditableData({
                  ...editableData,
                  colors: {
                    ...editableData.colors,
                    [colorKey]: e.target.value
                  }
                })}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setEditableData({
                  ...editableData,
                  colors: {
                    ...editableData.colors,
                    [colorKey]: e.target.value
                  }
                })}
                className="flex-1 font-mono text-sm"
                placeholder="#000000"
              />
            </div>
            <div className="font-medium text-sm">{label}</div>
          </>
        ) : (
          <button
            onClick={() => handleCopy(color, itemId)}
            className="w-full text-left space-y-2 hover:scale-105 transition-transform"
          >
            <div
              className="h-24 rounded-lg border-2 border-border shadow-sm relative overflow-hidden group"
              style={{ backgroundColor: color }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                {isCopied ? (
                  <Check className="h-6 w-6 text-white" />
                ) : (
                  <Copy className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <div>
              <div className="font-medium text-sm">{label}</div>
              <div className="text-xs text-muted-foreground font-mono">{color}</div>
            </div>
          </button>
        )}
      </div>
    );
  };

  const FontPreview = ({ 
    fontFamily, 
    label, 
    size, 
    weight = '400',
    onFontChange,
    onSizeChange
  }: { 
    fontFamily: string; 
    label: string; 
    size: string; 
    weight?: string;
    onFontChange?: (value: string) => void;
    onSizeChange?: (value: string) => void;
  }) => (
    <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium mb-2">{label}</div>
          {isEditing ? (
            <div className="flex gap-2">
              <Input
                value={fontFamily}
                onChange={(e) => onFontChange?.(e.target.value)}
                placeholder="Font family"
                className="flex-1"
              />
              <Input
                value={size}
                onChange={(e) => onSizeChange?.(e.target.value)}
                placeholder="Size"
                className="w-24"
              />
            </div>
          ) : (
            <>
              <div className="text-xs text-muted-foreground">{fontFamily}</div>
              <Badge variant="outline" className="font-mono text-xs mt-1">
                {size}
              </Badge>
            </>
          )}
        </div>
      </div>
      <div 
        className="p-4 bg-background rounded border"
        style={{ 
          fontFamily: fontFamily, 
          fontSize: size,
          fontWeight: weight 
        }}
      >
        The quick brown fox jumps over the lazy dog
      </div>
    </div>
  );

  const EditableSpacingBox = ({ 
    size, 
    label,
    onSizeChange 
  }: { 
    size: string; 
    label: string;
    onSizeChange?: (value: string) => void;
  }) => (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-3">
        <div 
          className="bg-primary rounded"
          style={{ width: size, height: size }}
        />
        {isEditing ? (
          <Input
            value={size}
            onChange={(e) => onSizeChange?.(e.target.value)}
            className="w-32 font-mono text-sm"
            placeholder="8px"
          />
        ) : (
          <div className="text-xs text-muted-foreground font-mono">{size}</div>
        )}
      </div>
    </div>
  );

  const EditableBorderRadiusPreview = ({ 
    radius, 
    label,
    onRadiusChange 
  }: { 
    radius: string; 
    label: string;
    onRadiusChange?: (value: string) => void;
  }) => (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-3">
        <div 
          className="w-16 h-16 bg-primary/20 border-2 border-primary"
          style={{ borderRadius: radius }}
        />
        {isEditing ? (
          <Input
            value={radius}
            onChange={(e) => onRadiusChange?.(e.target.value)}
            className="w-32 font-mono text-sm"
            placeholder="4px"
          />
        ) : (
          <div className="text-xs text-muted-foreground font-mono">{radius}</div>
        )}
      </div>
    </div>
  );

  const SectionDivider = ({ title, description }: { title: string; description?: string }) => (
    <div className="pt-8 pb-4 border-t">
      <h2 className="text-2xl font-semibold mb-1">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );

  // Scroll to section function
  const scrollToSection = (sectionId: string) => {
    const section = navSections.find(s => s.id === sectionId);
    if (section?.ref.current && contentAreaRef.current) {
      const container = contentAreaRef.current;
      const element = section.ref.current;
      const offsetTop = element.offsetTop - container.offsetTop - 120;
      container.scrollTo({ top: offsetTop, behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  // Track scroll position to update active section
  useEffect(() => {
    if (!contentAreaRef.current) return;

    const handleScroll = () => {
      const container = contentAreaRef.current;
      if (!container) return;

      const scrollPosition = container.scrollTop + 200;

      for (let i = navSections.length - 1; i >= 0; i--) {
        const section = navSections[i];
        if (section.ref.current) {
          const offsetTop = section.ref.current.offsetTop - container.offsetTop;
          if (scrollPosition >= offsetTop) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    const container = contentAreaRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle edit mode
  const handleEdit = () => {
    if (isLocked) return;
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    console.log('Saved changes:', editableData);
  };

  const handleCancel = () => {
    setEditableData(styleData);
    setIsEditing(false);
  };

  const toggleLock = () => {
    if (isEditing) return;
    setIsLocked(!isLocked);
  };

  // Helper functions for editing arrays
  const addKeyword = () => {
    if (!editableData.tonology) return;
    const newKeyword = prompt('Voeg een keyword toe:');
    if (newKeyword) {
      setEditableData({
        ...editableData,
        tonology: {
          ...editableData.tonology,
          keywords: [...editableData.tonology.keywords, newKeyword]
        }
      });
    }
  };

  const removeKeyword = (index: number) => {
    if (!editableData.tonology) return;
    const newKeywords = [...editableData.tonology.keywords];
    newKeywords.splice(index, 1);
    setEditableData({
      ...editableData,
      tonology: {
        ...editableData.tonology,
        keywords: newKeywords
      }
    });
  };

  const addDo = () => {
    if (!editableData.tonology) return;
    const newDo = prompt('Voeg een Do toe:');
    if (newDo) {
      setEditableData({
        ...editableData,
        tonology: {
          ...editableData.tonology,
          dosDonts: {
            ...editableData.tonology.dosDonts,
            dos: [...editableData.tonology.dosDonts.dos, newDo]
          }
        }
      });
    }
  };

  const removeDo = (index: number) => {
    if (!editableData.tonology) return;
    const newDos = [...editableData.tonology.dosDonts.dos];
    newDos.splice(index, 1);
    setEditableData({
      ...editableData,
      tonology: {
        ...editableData.tonology,
        dosDonts: {
          ...editableData.tonology.dosDonts,
          dos: newDos
        }
      }
    });
  };

  const addDont = () => {
    if (!editableData.tonology) return;
    const newDont = prompt("Voeg een Don't toe:");
    if (newDont) {
      setEditableData({
        ...editableData,
        tonology: {
          ...editableData.tonology,
          dosDonts: {
            ...editableData.tonology.dosDonts,
            donts: [...editableData.tonology.dosDonts.donts, newDont]
          }
        }
      });
    }
  };

  const removeDont = (index: number) => {
    if (!editableData.tonology) return;
    const newDonts = [...editableData.tonology.dosDonts.donts];
    newDonts.splice(index, 1);
    setEditableData({
      ...editableData,
      tonology: {
        ...editableData.tonology,
        dosDonts: {
          ...editableData.tonology.dosDonts,
          donts: newDonts
        }
      }
    });
  };

  return (
    <div ref={contentAreaRef} className="h-full overflow-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Analyzer
          </Button>
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Paintbrush className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-semibold">Brand Styleguide</h1>
                  {isLocked ? (
                    <Badge variant="secondary" className="gap-1.5">
                      <Lock className="h-3 w-3" />
                      Locked
                    </Badge>
                  ) : isEditing ? (
                    <Badge variant="default" className="gap-1.5 bg-primary">
                      <Edit3 className="h-3 w-3" />
                      Editing
                    </Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-1">
                  Analyzed from: {new URL(styleData.url).hostname}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <XIcon className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleLock}
                  >
                    {isLocked ? (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Unlock
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Lock
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleEdit}
                    disabled={isLocked}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  <Button size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Anchor Navigation */}
        <div className="border-t bg-muted/30">
          <div className="max-w-7xl mx-auto px-8 py-3">
            <div className="flex items-center gap-2 flex-wrap">
              {navSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeSection === section.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        
        {/* ========== VISUAL IDENTITY ========== */}
        <div ref={visualIdentityRef}>
          <SectionDivider 
            title="Visual Identity" 
            description="Kernvisuele elementen die de merkidentiteit definiëren"
          />

          <div className="space-y-6">
            {/* Logo Section */}
            {styleData.logo && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Logo & Branding</CardTitle>
                      <CardDescription>Primaire logo's en variaties</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Primary Logo */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Primair Logo</div>
                    <div className="p-8 border-2 border-dashed rounded-lg bg-muted/30 flex items-center justify-center">
                      <img 
                        src={styleData.logo.primary} 
                        alt="Primary Logo" 
                        className="max-h-24 object-contain"
                      />
                    </div>
                    {isEditing && (
                      <p className="text-xs text-muted-foreground">💡 Upload functionaliteit kan worden toegevoegd</p>
                    )}
                  </div>

                  {/* Logo Variations */}
                  {styleData.logo.variations && styleData.logo.variations.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Logo Variaties</div>
                      <div className="grid grid-cols-3 gap-4">
                        {styleData.logo.variations.map((variation, index) => (
                          <div key={index} className="p-6 border rounded-lg bg-muted/30 flex items-center justify-center">
                            <img 
                              src={variation} 
                              alt={`Logo Variatie ${index + 1}`} 
                              className="max-h-16 object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Favicon */}
                  {styleData.logo.favicon && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Favicon</div>
                      <div className="inline-flex p-4 border rounded-lg bg-muted/30">
                        <img 
                          src={styleData.logo.favicon} 
                          alt="Favicon" 
                          className="h-8 w-8 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Colors Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Paintbrush className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Kleurenpalet</CardTitle>
                    <CardDescription>
                      {isEditing ? 'Klik op de color picker of voer hex code in om kleuren aan te passen' : 'Klik op een kleur om de HEX code te kopiëren'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <EditableColorSwatch 
                    color={editableData.colors.primary} 
                    label="Primary" 
                    colorKey="primary"
                  />
                  <EditableColorSwatch 
                    color={editableData.colors.secondary} 
                    label="Secondary" 
                    colorKey="secondary"
                  />
                  <EditableColorSwatch 
                    color={editableData.colors.accent} 
                    label="Accent" 
                    colorKey="accent"
                  />
                  <EditableColorSwatch 
                    color={editableData.colors.text} 
                    label="Text" 
                    colorKey="text"
                  />
                  <EditableColorSwatch 
                    color={editableData.colors.background} 
                    label="Background" 
                    colorKey="background"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ========== DESIGN SYSTEM ========== */}
        <div ref={designSystemRef}>
          <SectionDivider 
            title="Design System" 
            description="Typografie, spacing en vormtaal voor consistente design"
          />

          <div className="space-y-6">
            {/* Typography Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Type className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Typografie</CardTitle>
                    <CardDescription>Font families en groottes gebruikt in de website</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <FontPreview
                    fontFamily={editableData.typography.headingFont}
                    label="Heading Font - H1"
                    size={editableData.typography.fontSize.h1}
                    weight="700"
                    onFontChange={(value) => setEditableData({
                      ...editableData,
                      typography: {
                        ...editableData.typography,
                        headingFont: value
                      }
                    })}
                    onSizeChange={(value) => setEditableData({
                      ...editableData,
                      typography: {
                        ...editableData.typography,
                        fontSize: {
                          ...editableData.typography.fontSize,
                          h1: value
                        }
                      }
                    })}
                  />
                  <FontPreview
                    fontFamily={editableData.typography.headingFont}
                    label="Heading Font - H2"
                    size={editableData.typography.fontSize.h2}
                    weight="600"
                    onFontChange={(value) => setEditableData({
                      ...editableData,
                      typography: {
                        ...editableData.typography,
                        headingFont: value
                      }
                    })}
                    onSizeChange={(value) => setEditableData({
                      ...editableData,
                      typography: {
                        ...editableData.typography,
                        fontSize: {
                          ...editableData.typography.fontSize,
                          h2: value
                        }
                      }
                    })}
                  />
                  <FontPreview
                    fontFamily={editableData.typography.bodyFont}
                    label="Body Font"
                    size={editableData.typography.fontSize.body}
                    weight="400"
                    onFontChange={(value) => setEditableData({
                      ...editableData,
                      typography: {
                        ...editableData.typography,
                        bodyFont: value
                      }
                    })}
                    onSizeChange={(value) => setEditableData({
                      ...editableData,
                      typography: {
                        ...editableData.typography,
                        fontSize: {
                          ...editableData.typography.fontSize,
                          body: value
                        }
                      }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shapes Section */}
            {styleData.shapes && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Shapes className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Vormentaal</CardTitle>
                      <CardDescription>{styleData.shapes.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Primary Shapes */}
                  <div>
                    <div className="text-sm font-medium mb-3">Primaire Vormen</div>
                    <div className="flex flex-wrap gap-2">
                      {styleData.shapes.primaryShapes.map((shape, index) => (
                        <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                          {shape}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Shape Examples */}
                  <div>
                    <div className="text-sm font-medium mb-3">Toepassingen</div>
                    <div className="grid gap-3">
                      {styleData.shapes.examples.map((example, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-muted/30 flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-sm mb-1">{example.shape}</div>
                            <div className="text-sm text-muted-foreground">{example.usage}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Spacing & Border Radius */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Spacing */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Layout className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Spacing</CardTitle>
                      <CardDescription>Padding en margin systeem</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <EditableSpacingBox 
                    size={editableData.spacing.small} 
                    label="Small" 
                    onSizeChange={(value) => setEditableData({
                      ...editableData,
                      spacing: {
                        ...editableData.spacing,
                        small: value
                      }
                    })}
                  />
                  <EditableSpacingBox 
                    size={editableData.spacing.medium} 
                    label="Medium" 
                    onSizeChange={(value) => setEditableData({
                      ...editableData,
                      spacing: {
                        ...editableData.spacing,
                        medium: value
                      }
                    })}
                  />
                  <EditableSpacingBox 
                    size={editableData.spacing.large} 
                    label="Large" 
                    onSizeChange={(value) => setEditableData({
                      ...editableData,
                      spacing: {
                        ...editableData.spacing,
                        large: value
                      }
                    })}
                  />
                </CardContent>
              </Card>

              {/* Border Radius */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Circle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Border Radius</CardTitle>
                      <CardDescription>Afrondingen voor componenten</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <EditableBorderRadiusPreview 
                    radius={editableData.borderRadius.small} 
                    label="Small" 
                    onRadiusChange={(value) => setEditableData({
                      ...editableData,
                      borderRadius: {
                        ...editableData.borderRadius,
                        small: value
                      }
                    })}
                  />
                  <EditableBorderRadiusPreview 
                    radius={editableData.borderRadius.medium} 
                    label="Medium" 
                    onRadiusChange={(value) => setEditableData({
                      ...editableData,
                      borderRadius: {
                        ...editableData.borderRadius,
                        medium: value
                      }
                    })}
                  />
                  <EditableBorderRadiusPreview 
                    radius={editableData.borderRadius.large} 
                    label="Large" 
                    onRadiusChange={(value) => setEditableData({
                      ...editableData,
                      borderRadius: {
                        ...editableData.borderRadius,
                        large: value
                      }
                    })}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Icons Section */}
            {styleData.icons && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Square className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Iconen</CardTitle>
                      <CardDescription>
                        Icon stijl: <Badge variant="outline" className="ml-2">{styleData.icons.style}</Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {styleData.icons.examples.map((icon, index) => (
                      <div key={index} className="aspect-square rounded-lg border bg-muted/30 p-4 flex items-center justify-center hover:bg-muted/50 transition-colors">
                        <img 
                          src={icon} 
                          alt={`Icon ${index + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ========== CONTENT ASSETS ========== */}
        <div ref={contentAssetsRef}>
          <SectionDivider 
            title="Content Assets" 
            description="Fotografie en illustraties voor merkuitingen"
          />

          <div className="space-y-6">
            {/* Corporate Photos Section */}
            {styleData.corporatePhotos && styleData.corporatePhotos.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Corporate Fotografie</CardTitle>
                      <CardDescription>Professionele bedrijfsfoto's en team impressies</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {styleData.corporatePhotos.map((photo, index) => (
                      <div key={index} className="aspect-square rounded-lg border overflow-hidden bg-muted group">
                        <img 
                          src={photo} 
                          alt={`Corporate foto ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Campaign Photos Section */}
            {styleData.campaignPhotos && styleData.campaignPhotos.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Megaphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Campagne Fotografie</CardTitle>
                      <CardDescription>Marketing en campagne visuals</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {styleData.campaignPhotos.map((photo, index) => (
                      <div key={index} className="aspect-square rounded-lg border overflow-hidden bg-muted group">
                        <img 
                          src={photo} 
                          alt={`Campagne foto ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Illustrations Section */}
            {styleData.illustrations && styleData.illustrations.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Illustraties</CardTitle>
                      <CardDescription>Grafische elementen en illustraties</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {styleData.illustrations.map((illustration, index) => (
                      <div key={index} className="aspect-square rounded-lg border overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 flex items-center justify-center">
                        <img 
                          src={illustration} 
                          alt={`Illustratie ${index + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ========== BRAND VOICE ========== */}
        <div ref={brandVoiceRef}>
          <SectionDivider 
            title="Brand Voice" 
            description="Tone of voice en communicatiestijl"
          />

          <div className="space-y-6">
            {/* Tonology Section */}
            {styleData.tonology && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle>Tone of Voice</CardTitle>
                      <CardDescription>Communicatiestijl en merkpersoonlijkheid</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tone & Voice */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="text-sm font-medium mb-2 text-muted-foreground">Tone</div>
                      {isEditing ? (
                        <Input 
                          value={editableData.tonology?.tone || ''}
                          onChange={(e) => setEditableData({
                            ...editableData,
                            tonology: {
                              ...editableData.tonology!,
                              tone: e.target.value
                            }
                          })}
                          className="text-base font-medium"
                          placeholder="Bijv. Vriendelijk, professioneel"
                        />
                      ) : (
                        <div className="text-base font-medium">{editableData.tonology?.tone}</div>
                      )}
                    </div>
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="text-sm font-medium mb-2 text-muted-foreground">Voice</div>
                      {isEditing ? (
                        <Input 
                          value={editableData.tonology?.voice || ''}
                          onChange={(e) => setEditableData({
                            ...editableData,
                            tonology: {
                              ...editableData.tonology!,
                              voice: e.target.value
                            }
                          })}
                          className="text-base font-medium"
                          placeholder="Bijv. Authentiek, inspirerend"
                        />
                      ) : (
                        <div className="text-base font-medium">{editableData.tonology?.voice}</div>
                      )}
                    </div>
                  </div>

                  {/* Keywords */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium">Kernwaarden & Keywords</div>
                      {isEditing && (
                        <Button size="sm" variant="outline" onClick={addKeyword}>
                          <Plus className="h-3 w-3 mr-1" />
                          Toevoegen
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editableData.tonology.keywords.map((keyword, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-sm px-3 py-1.5 gap-1.5"
                        >
                          <Tag className="h-3 w-3" />
                          {keyword}
                          {isEditing && (
                            <button
                              onClick={() => removeKeyword(index)}
                              className="ml-1 hover:text-destructive"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Do's and Don'ts */}
                  <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                    {/* Do's */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                          </div>
                          <div className="font-semibold">Do's</div>
                        </div>
                        {isEditing && (
                          <Button size="sm" variant="outline" onClick={addDo}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <ul className="space-y-2.5">
                        {editableData.tonology.dosDonts.dos.map((item, index) => (
                          <li key={index} className="flex items-start gap-2.5 text-sm group">
                            <Check className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground flex-1">{item}</span>
                            {isEditing && (
                              <button
                                onClick={() => removeDo(index)}
                                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Don'ts */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
                          </div>
                          <div className="font-semibold">Don'ts</div>
                        </div>
                        {isEditing && (
                          <Button size="sm" variant="outline" onClick={addDont}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <ul className="space-y-2.5">
                        {editableData.tonology.dosDonts.donts.map((item, index) => (
                          <li key={index} className="flex items-start gap-2.5 text-sm group">
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground flex-1">{item}</span>
                            {isEditing && (
                              <button
                                onClick={() => removeDont(index)}
                                className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ========== TECHNICAL ========== */}
        <div ref={technicalRef}>
          <SectionDivider 
            title="Technical Implementation" 
            description="CSS variabelen voor developers"
          />

          <div className="space-y-6">
            {/* CSS Export */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FileCode className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>CSS Variables</CardTitle>
                    <CardDescription>
                      {isEditing ? 'Live preview van je aangepaste CSS variabelen' : 'Kopieer deze CSS variabelen naar je stylesheet'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-3 right-3 z-10"
                    onClick={() => handleCopy(cssVariables, 'css-vars')}
                  >
                    {copiedItem === 'css-vars' ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Gekopieerd
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Kopieer
                      </>
                    )}
                  </Button>
                  <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-x-auto border">
                    {cssVariables}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Usage Tips */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">💡 Volgende stappen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-sm mb-1">Pas de styleguide aan</div>
                    <div className="text-sm text-muted-foreground">
                      Klik op "Bewerken" om kleuren, typografie en andere elementen aan te passen
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-sm mb-1">Exporteer de styleguide</div>
                    <div className="text-sm text-muted-foreground">
                      Klik op "Exporteren" om een PDF of Figma bestand te genereren
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-sm mb-1">Lock de styleguide</div>
                    <div className="text-sm text-muted-foreground">
                      Vergrendel de styleguide om ongewenste wijzigingen te voorkomen
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-12" />
      </div>
    </div>
  );
}