import React, { useState, useRef } from 'react';
import { Globe, Loader2, Sparkles, Check, AlertCircle, FileUp, Upload, X, Paintbrush } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

export interface BrandStyleData {
  url: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    fontSize: {
      h1: string;
      h2: string;
      body: string;
    };
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  logo?: {
    primary: string;
    secondary?: string;
    favicon?: string;
    variations?: string[];
  };
  corporatePhotos?: string[];
  campaignPhotos?: string[];
  illustrations?: string[];
  icons?: {
    style: string;
    examples: string[];
  };
  tonology?: {
    tone: string;
    voice: string;
    keywords: string[];
    dosDonts: {
      dos: string[];
      donts: string[];
    };
  };
  shapes?: {
    description: string;
    primaryShapes: string[];
    examples: {
      shape: string;
      usage: string;
    }[];
  };
  screenshots?: string[];
}

interface BrandstyleAnalyzerProps {
  onAnalysisComplete: (data: BrandStyleData) => void;
}

type AnalysisMode = 'url' | 'pdf';

export function BrandstyleAnalyzer({ onAnalysisComplete }: BrandstyleAnalyzerProps) {
  const [mode, setMode] = useState<AnalysisMode>('url');
  const [url, setUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateUrl = (input: string): boolean => {
    try {
      const urlObj = new URL(input.startsWith('http') ? input : `https://${input}`);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const generateMockStyleData = (source: string): BrandStyleData => {
    return {
      url: source,
      colors: {
        primary: '#1FD1B2',
        secondary: '#5252E3',
        accent: '#FF6B6B',
        text: '#1F2937',
        background: '#FFFFFF',
      },
      typography: {
        headingFont: 'Halyard Display, sans-serif',
        bodyFont: 'Inter, system-ui, sans-serif',
        fontSize: {
          h1: '48px',
          h2: '32px',
          body: '16px',
        },
      },
      spacing: {
        small: '8px',
        medium: '16px',
        large: '32px',
      },
      borderRadius: {
        small: '4px',
        medium: '8px',
        large: '16px',
      },
      logo: {
        primary: 'https://images.unsplash.com/photo-1749104953185-d171e149ccb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
        secondary: 'https://images.unsplash.com/photo-1749104953185-d171e149ccb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
        favicon: 'https://images.unsplash.com/photo-1749104953185-d171e149ccb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=64',
        variations: [
          'https://images.unsplash.com/photo-1749104953185-d171e149ccb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300',
          'https://images.unsplash.com/photo-1749104953185-d171e149ccb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300',
          'https://images.unsplash.com/photo-1749104953185-d171e149ccb5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=300',
        ],
      },
      corporatePhotos: [
        'https://images.unsplash.com/photo-1630487656049-6db93a53a7e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
        'https://images.unsplash.com/photo-1629507208649-70919ca33793?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop',
      ],
      campaignPhotos: [
        'https://images.unsplash.com/photo-1763256552751-db613582fb2c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
        'https://images.unsplash.com/photo-1714371981396-b22e88a23437?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop',
      ],
      illustrations: [
        'https://images.unsplash.com/photo-1716201499421-fed15f55f5b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
        'https://images.unsplash.com/photo-1734549097883-fb428ab88cb2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800',
        'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=800&h=600&fit=crop',
      ],
      icons: {
        style: 'Outlined, minimalistisch met 2px stroke',
        examples: [
          'https://images.unsplash.com/photo-1633409361618-c73427e4e206?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
          'https://images.unsplash.com/photo-1633409361618-c73427e4e206?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
          'https://images.unsplash.com/photo-1633409361618-c73427e4e206?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
        ],
      },
      tonology: {
        tone: 'Professioneel & betrouwbaar',
        voice: 'Vriendelijk en toegankelijk, maar met autoriteit',
        keywords: ['Innovatie', 'Kwaliteit', 'Betrouwbaarheid', 'Transparantie', 'Duurzaamheid'],
        dosDonts: {
          dos: [
            'Gebruik duidelijke, directe taal',
            'Wees consistent in tone of voice',
            'Spreek de klant persoonlijk aan',
            'Gebruik actieve zinnen',
            'Toon empathie en begrip'
          ],
          donts: [
            'Gebruik geen jargon of vaaktermen',
            'Vermijd vage uitspraken',
            'Wees niet te formeel of afstandelijk',
            'Gebruik geen negatieve framing',
            'Maak geen ongefundeerde claims'
          ],
        },
      },
      shapes: {
        description: 'De vormentaal combineert geometrische precisie met organische elementen voor een moderne, toegankelijke uitstraling.',
        primaryShapes: ['Afgeronde rechthoeken', 'Cirkels', 'Zachte curves'],
        examples: [
          { 
            shape: 'Afgeronde rechthoeken (8-16px radius)', 
            usage: 'Buttons, cards, containers en afbeeldingen' 
          },
          { 
            shape: 'Perfecte cirkels', 
            usage: 'Avatars, icon containers en badges' 
          },
          { 
            shape: 'Zachte curves & waves', 
            usage: 'Decoratieve elementen, section dividers en achtergronden' 
          },
          { 
            shape: 'Subtiele schaduwlagen', 
            usage: 'Depth & hierarchy in UI componenten' 
          },
        ],
      },
      screenshots: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop',
      ],
    };
  };

  const handleAnalyze = async () => {
    setError('');
    
    if (!url.trim()) {
      setError('Please enter a website URL');
      return;
    }

    if (!validateUrl(url)) {
      setError('Please enter a valid URL (e.g., www.example.com)');
      return;
    }

    setIsAnalyzing(true);

    setTimeout(() => {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      const mockStyleData = generateMockStyleData(normalizedUrl);
      setIsAnalyzing(false);
      onAnalysisComplete(mockStyleData);
    }, 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be 10MB or less');
        return;
      }
      setError('');
      setUploadedFile(file);
    }
  };

  const handleAnalyzePDF = async () => {
    if (!uploadedFile) {
      setError('Please upload a PDF file first');
      return;
    }

    setIsAnalyzing(true);

    setTimeout(() => {
      const mockStyleData = generateMockStyleData(`PDF: ${uploadedFile.name}`);
      setIsAnalyzing(false);
      onAnalysisComplete(mockStyleData);
    }, 3000);
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Paintbrush className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold mb-1">Brandstyle Analyzer</h1>
              <p className="text-muted-foreground">
                Analyze a website or upload a brand styleguide PDF
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="space-y-8">
          
          {/* Mode Selector Tabs */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => {
                setMode('url');
                setError('');
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'url'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="h-4 w-4 inline-block mr-2" />
              Website URL
            </button>
            <button
              onClick={() => {
                setMode('pdf');
                setError('');
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'pdf'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileUp className="h-4 w-4 inline-block mr-2" />
              PDF Upload
            </button>
          </div>

          {/* URL Mode */}
          {mode === 'url' && (
            <>
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <Globe className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">Analyze Website URL</CardTitle>
                      <CardDescription className="text-base">
                        Enter a website URL and our AI automatically analyzes the brand style, 
                        including colors, typography, spacing, and other visual elements.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* URL Input */}
                  <div className="space-y-2">
                    <label htmlFor="website-url" className="text-sm font-medium">
                      Website URL
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website-url"
                          type="text"
                          placeholder="www.example.com or https://example.com"
                          value={url}
                          onChange={(e) => {
                            setUrl(e.target.value);
                            setError('');
                          }}
                          onKeyPress={handleKeyPress}
                          className="pl-10"
                          disabled={isAnalyzing}
                        />
                      </div>
                      <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !url.trim()}
                        className="px-6"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                    {error && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Color Palette Extraction</div>
                        <div className="text-xs text-muted-foreground">Primary, secondary and accent colors</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Typography Analysis</div>
                        <div className="text-xs text-muted-foreground">Fonts, sizes and hierarchy</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Spacing & Layout</div>
                        <div className="text-xs text-muted-foreground">Margins, padding and grid system</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Component Styles</div>
                        <div className="text-xs text-muted-foreground">Buttons, borders and shadows</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Examples */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Example websites to try</CardTitle>
                  <CardDescription>
                    Click an example to start the analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { name: 'Stripe', url: 'stripe.com', desc: 'Fintech & Payments' },
                      { name: 'Airbnb', url: 'airbnb.com', desc: 'Travel & Hospitality' },
                      { name: 'Figma', url: 'figma.com', desc: 'Design Tools' },
                      { name: 'Notion', url: 'notion.so', desc: 'Productivity' },
                    ].map((example) => (
                      <button
                        key={example.url}
                        onClick={() => setUrl(example.url)}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                      >
                        <div>
                          <div className="font-medium text-sm">{example.name}</div>
                          <div className="text-xs text-muted-foreground">{example.desc}</div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {example.url}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* PDF Mode */}
          {mode === 'pdf' && (
            <>
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-950/20 dark:to-pink-950/20">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <FileUp className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">PDF Styleguide Uploaden</CardTitle>
                      <CardDescription className="text-base">
                        Upload een bestaande brand styleguide in PDF formaat. Onze AI analyseert 
                        het document en extraheert alle visuele elementen automatisch.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload Area */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Brand Styleguide PDF
                    </label>
                    
                    {!uploadedFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed rounded-lg p-8 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Upload className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium mb-1">Klik om een bestand te uploaden</div>
                            <div className="text-sm text-muted-foreground">
                              Of sleep een PDF bestand hier naartoe
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            PDF • Max 10MB
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                            <FileUp className="h-5 w-5 text-red-600 dark:text-red-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{uploadedFile.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removeUploadedFile}
                            className="flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {error && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    )}
                  </div>

                  {uploadedFile && (
                    <Button
                      onClick={handleAnalyzePDF}
                      disabled={isAnalyzing}
                      className="w-full"
                      size="lg"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          PDF Analyseren...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          PDF Analyseren
                        </>
                      )}
                    </Button>
                  )}

                  {/* Features List */}
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Automatische Extractie</div>
                        <div className="text-xs text-muted-foreground">Kleuren, fonts en design elementen</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Logo Detectie</div>
                        <div className="text-xs text-muted-foreground">Primaire logo's en variaties</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Tone of Voice</div>
                        <div className="text-xs text-muted-foreground">Communicatiestijl en richtlijnen</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Beeldmateriaal</div>
                        <div className="text-xs text-muted-foreground">Foto's en illustraties</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Wat voor PDF kan ik uploaden?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      ✓
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1">Brand Styleguides</div>
                      <div className="text-sm text-muted-foreground">
                        Complete brand identity documenten met logo's, kleuren en typografie
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      ✓
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1">Design Systems</div>
                      <div className="text-sm text-muted-foreground">
                        Documenten met componenten, spacing en design tokens
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      ✓
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1">Brand Manuals</div>
                      <div className="text-sm text-muted-foreground">
                        Merkhandboeken met tone of voice en visuele richtlijnen
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* General Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hoe werkt het?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                  1
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">
                    {mode === 'url' ? 'Voer een website URL in' : 'Upload een PDF styleguide'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {mode === 'url' 
                      ? 'Plak de URL van een website waarvan je de huisstijl wilt analyseren'
                      : 'Upload een bestaand brand styleguide document in PDF formaat'}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                  2
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">
                    {mode === 'url' ? 'AI analyseert de website' : 'AI analyseert de PDF'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {mode === 'url'
                      ? 'Onze AI scant de website en extraheert alle visuele design elementen'
                      : 'Onze AI leest het document en extraheert alle design elementen en richtlijnen'}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                  3
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Bekijk je styleguide</div>
                  <div className="text-sm text-muted-foreground">
                    Je krijgt een volledige styleguide met alle kleuren, fonts en stijlelementen
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}