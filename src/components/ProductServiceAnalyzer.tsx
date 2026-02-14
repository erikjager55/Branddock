import React, { useState, useRef } from 'react';
import { Globe, Loader2, Sparkles, Check, AlertCircle, FileUp, Upload, X, Package, FileText, Users, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { usePersonas } from '../contexts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

export interface ProductServiceData {
  id?: string; // Optional, will be generated when added to products context
  source: string;
  name: string;
  description: string;
  category: string;
  pricing: {
    model: string;
    price?: string;
    amount?: string; // Alternative name used in some places
    currency?: string;
  };
  features: string[];
  benefits: string[];
  useCases: string[];
  targetAudience?: string[]; // Legacy field for old data
  personaIds?: string[]; // New field for persona references
  specifications?: {
    key: string;
    value: string;
  }[];
  images?: string[];
  competitors?: string[];
}

interface ProductServiceAnalyzerProps {
  onAnalysisComplete: (data: ProductServiceData) => void;
}

type AnalysisMode = 'url' | 'pdf' | 'manual';

export function ProductServiceAnalyzer({ onAnalysisComplete }: ProductServiceAnalyzerProps) {
  const [mode, setMode] = useState<AnalysisMode>('url');
  const [url, setUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get personas from context
  const { personas } = usePersonas();
  const [selectedPersonaIds, setSelectedPersonaIds] = useState<string[]>([]);
  const [showPersonaDialog, setShowPersonaDialog] = useState(false);

  // Manual form fields
  const [manualForm, setManualForm] = useState({
    name: '',
    description: '',
    category: '',
    pricing: '',
    features: '',
    benefits: '',
    useCases: '',
  });

  const validateUrl = (input: string): boolean => {
    try {
      const urlObj = new URL(input.startsWith('http') ? input : `https://${input}`);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const generateMockProductData = (source: string): ProductServiceData => {
    return {
      source,
      name: 'Premium Marketing Suite',
      description: 'Een complete marketingoplossing voor middelgrote bedrijven, met geavanceerde analytics, automation en campagne management tools.',
      category: 'Marketing Software',
      pricing: {
        model: 'Subscription',
        price: '€99',
        amount: '€99', // Alternative name used in some places
        currency: 'EUR',
      },
      features: [
        'Multi-channel campaign management',
        'Advanced analytics dashboard',
        'Marketing automation workflows',
        'A/B testing capabilities',
        'Social media integration',
        'Email marketing tools',
        'CRM integration',
        'Real-time reporting',
      ],
      benefits: [
        'Verhoog conversie met 40% gemiddeld',
        'Bespaar 15 uur per week op repetitieve taken',
        'Krijg 360° inzicht in klantgedrag',
        'Schaal je marketing zonder extra personeel',
        'Verbeter ROI met data-driven beslissingen',
      ],
      useCases: [
        'Lead generation campagnes',
        'Customer retention programma\'s',
        'Product launches',
        'Brand awareness campagnes',
        'Event marketing',
      ],
      specifications: [
        { key: 'Deployment', value: 'Cloud-based SaaS' },
        { key: 'Integrations', value: '50+ native integrations' },
        { key: 'Support', value: '24/7 chat & email' },
        { key: 'Users', value: 'Unlimited team members' },
        { key: 'Data Storage', value: 'Unlimited' },
      ],
      images: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop',
      ],
      competitors: [
        'HubSpot Marketing Hub',
        'Marketo',
        'ActiveCampaign',
        'Mailchimp',
      ],
    };
  };

  const handleAnalyze = async () => {
    setError('');
    
    if (!url.trim()) {
      setError('Voer een product/service URL in');
      return;
    }

    if (!validateUrl(url)) {
      setError('Voer een geldige URL in (bijv. www.example.com/product)');
      return;
    }

    setIsAnalyzing(true);

    setTimeout(() => {
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      const mockData = generateMockProductData(normalizedUrl);
      // Add selected personas to the data
      mockData.personaIds = selectedPersonaIds.length > 0 ? selectedPersonaIds : undefined;
      setIsAnalyzing(false);
      onAnalysisComplete(mockData);
    }, 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Alleen PDF bestanden zijn toegestaan');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Bestand mag maximaal 10MB zijn');
        return;
      }
      setError('');
      setUploadedFile(file);
    }
  };

  const handleAnalyzePDF = async () => {
    if (!uploadedFile) {
      setError('Upload eerst een PDF bestand');
      return;
    }

    setIsAnalyzing(true);

    setTimeout(() => {
      const mockData = generateMockProductData(`PDF: ${uploadedFile.name}`);
      // Add selected personas to the data
      mockData.personaIds = selectedPersonaIds.length > 0 ? selectedPersonaIds : undefined;
      setIsAnalyzing(false);
      onAnalysisComplete(mockData);
    }, 3000);
  };

  const removeUploadedFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = () => {
    // Validate required fields
    if (!manualForm.name.trim()) {
      setError('Product/service naam is verplicht');
      return;
    }
    if (!manualForm.description.trim()) {
      setError('Beschrijving is verplicht');
      return;
    }

    setError('');
    setIsAnalyzing(true);

    setTimeout(() => {
      const productData: ProductServiceData = {
        source: 'Manual Entry',
        name: manualForm.name,
        description: manualForm.description,
        category: manualForm.category || 'Uncategorized',
        pricing: {
          model: manualForm.pricing || 'Custom',
        },
        features: manualForm.features
          .split('\n')
          .filter(f => f.trim())
          .map(f => f.trim()),
        benefits: manualForm.benefits
          .split('\n')
          .filter(b => b.trim())
          .map(b => b.trim()),
        useCases: manualForm.useCases
          .split('\n')
          .filter(u => u.trim())
          .map(u => u.trim()),
        personaIds: selectedPersonaIds,
      };

      setIsAnalyzing(false);
      onAnalysisComplete(productData);
    }, 1000);
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
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold mb-1">Product & Service Analyzer</h1>
              <p className="text-muted-foreground">
                Analyseer een product via URL, upload een PDF, of voer handmatig gegevens in
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
            <button
              onClick={() => {
                setMode('manual');
                setError('');
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'manual'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="h-4 w-4 inline-block mr-2" />
              Handmatig Invoeren
            </button>
          </div>

          {/* URL Mode */}
          {mode === 'url' && (
            <>
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                      <Globe className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">Analyseer Product URL</CardTitle>
                      <CardDescription className="text-base">
                        Voer de URL van een productpagina in en onze AI analyseert automatisch alle kenmerken, 
                        voordelen en specificaties van het product of de service.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* URL Input */}
                  <div className="space-y-2">
                    <label htmlFor="product-url" className="text-sm font-medium">
                      Product/Service URL
                    </label>
                    <div className="flex gap-3">
                      <div className="flex-1 relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="product-url"
                          type="text"
                          placeholder="www.example.com/product of https://example.com/services"
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
                            Analyseren...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Analyseren
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
                        <div className="font-medium text-sm">Feature Extractie</div>
                        <div className="text-xs text-muted-foreground">Kenmerken en specificaties</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Voordelen Analyse</div>
                        <div className="text-xs text-muted-foreground">Benefits en USP's</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Doelgroep Identificatie</div>
                        <div className="text-xs text-muted-foreground">Target audience segmenten</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Prijsmodel</div>
                        <div className="text-xs text-muted-foreground">Pricing en value proposition</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Examples */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Voorbeelden om te proberen</CardTitle>
                  <CardDescription>
                    Klik op een voorbeeld om de analyse te starten
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { name: 'Slack', url: 'slack.com/products', desc: 'Team Collaboration' },
                      { name: 'Shopify', url: 'shopify.com/pricing', desc: 'E-commerce Platform' },
                      { name: 'Mailchimp', url: 'mailchimp.com/pricing/marketing', desc: 'Marketing Automation' },
                      { name: 'Zoom', url: 'zoom.us/pricing', desc: 'Video Conferencing' },
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
                      <CardTitle className="text-2xl mb-2">Upload Product/Service PDF</CardTitle>
                      <CardDescription className="text-base">
                        Upload een productsheet, brochure of servicebeschrijving in PDF formaat. Onze AI 
                        analyseert het document en extraheert alle relevante informatie automatisch.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload Area */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Product/Service Document PDF
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
                        <div className="text-xs text-muted-foreground">Features en specificaties</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Prijsinformatie</div>
                        <div className="text-xs text-muted-foreground">Pricing models en opties</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Use Cases</div>
                        <div className="text-xs text-muted-foreground">Toepassingen en voorbeelden</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-sm">Afbeeldingen</div>
                        <div className="text-xs text-muted-foreground">Product visuals extractie</div>
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
                      <div className="font-medium text-sm mb-1">Product Sheets</div>
                      <div className="text-sm text-muted-foreground">
                        Complete productbeschrijvingen met specificaties en kenmerken
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      ✓
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1">Service Brochures</div>
                      <div className="text-sm text-muted-foreground">
                        Documenten met servicebeschrijvingen en voordelen
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      ✓
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1">Product Catalogs</div>
                      <div className="text-sm text-muted-foreground">
                        Catalogussen met meerdere producten en prijslijsten
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Manual Mode */}
          {mode === 'manual' && (
            <>
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">Handmatig Product/Service Invoeren</CardTitle>
                      <CardDescription className="text-base">
                        Vul onderstaand formulier in met alle relevante informatie over je product of service. 
                        Je kunt later altijd nog details aanpassen.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="manual-name">
                        Product/Service Naam <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="manual-name"
                        placeholder="Bijv. Premium Marketing Suite"
                        value={manualForm.name}
                        onChange={(e) => {
                          setManualForm({ ...manualForm, name: e.target.value });
                          setError('');
                        }}
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="manual-description">
                        Beschrijving <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="manual-description"
                        placeholder="Korte beschrijving van je product of service..."
                        value={manualForm.description}
                        onChange={(e) => {
                          setManualForm({ ...manualForm, description: e.target.value });
                          setError('');
                        }}
                        rows={3}
                      />
                    </div>

                    {/* Category and Pricing */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="manual-category">Categorie</Label>
                        <Input
                          id="manual-category"
                          placeholder="Bijv. Marketing Software"
                          value={manualForm.category}
                          onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manual-pricing">Prijsmodel</Label>
                        <Input
                          id="manual-pricing"
                          placeholder="Bijv. €99/maand of Op aanvraag"
                          value={manualForm.pricing}
                          onChange={(e) => setManualForm({ ...manualForm, pricing: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2">
                      <Label htmlFor="manual-features">
                        Features & Kenmerken
                        <span className="text-xs text-muted-foreground ml-2">(Eén per regel)</span>
                      </Label>
                      <Textarea
                        id="manual-features"
                        placeholder="Multi-channel campaign management&#10;Advanced analytics dashboard&#10;Marketing automation workflows"
                        value={manualForm.features}
                        onChange={(e) => setManualForm({ ...manualForm, features: e.target.value })}
                        rows={4}
                      />
                    </div>

                    {/* Benefits */}
                    <div className="space-y-2">
                      <Label htmlFor="manual-benefits">
                        Voordelen & Benefits
                        <span className="text-xs text-muted-foreground ml-2">(Eén per regel)</span>
                      </Label>
                      <Textarea
                        id="manual-benefits"
                        placeholder="Verhoog conversie met 40% gemiddeld&#10;Bespaar 15 uur per week op repetitieve taken&#10;Krijg 360° inzicht in klantgedrag"
                        value={manualForm.benefits}
                        onChange={(e) => setManualForm({ ...manualForm, benefits: e.target.value })}
                        rows={4}
                      />
                    </div>

                    {/* Use Cases */}
                    <div className="space-y-2">
                      <Label htmlFor="manual-usecases">
                        Use Cases & Toepassingen
                        <span className="text-xs text-muted-foreground ml-2">(Eén per regel)</span>
                      </Label>
                      <Textarea
                        id="manual-usecases"
                        placeholder="Lead generation campagnes&#10;Customer retention programma's&#10;Product launches"
                        value={manualForm.useCases}
                        onChange={(e) => setManualForm({ ...manualForm, useCases: e.target.value })}
                        rows={3}
                      />
                    </div>

                    {/* Target Personas */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>
                          Doelgroep (Persona's)
                          <span className="text-xs text-muted-foreground ml-2">Koppel aan bestaande persona's</span>
                        </Label>
                        <Dialog open={showPersonaDialog} onOpenChange={setShowPersonaDialog}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Plus className="h-4 w-4" />
                              Selecteer Persona's
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Selecteer Doelgroep Persona's</DialogTitle>
                              <DialogDescription>
                                Kies één of meerdere persona's die de doelgroep vormen voor dit product/service
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 py-4">
                              {personas.length === 0 ? (
                                <div className="text-center py-8">
                                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                  <p className="text-sm text-muted-foreground mb-4">
                                    Je hebt nog geen persona's aangemaakt
                                  </p>
                                  <Button variant="outline" onClick={() => setShowPersonaDialog(false)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Ga naar Persona's sectie
                                  </Button>
                                </div>
                              ) : (
                                personas.map((persona) => {
                                  const isSelected = selectedPersonaIds.includes(persona.id);
                                  return (
                                    <button
                                      key={persona.id}
                                      onClick={() => {
                                        setSelectedPersonaIds(prev =>
                                          isSelected
                                            ? prev.filter(id => id !== persona.id)
                                            : [...prev, persona.id]
                                        );
                                      }}
                                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                        isSelected
                                          ? 'border-primary bg-primary/5'
                                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                      }`}
                                    >
                                      <div className="flex items-start gap-3">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                          isSelected ? 'bg-primary text-white' : 'bg-muted'
                                        }`}>
                                          {isSelected ? (
                                            <Check className="h-5 w-5" />
                                          ) : (
                                            <Users className="h-5 w-5 text-muted-foreground" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold">{persona.name}</h4>
                                            <Badge variant="outline" className="text-xs">
                                              {persona.demographics.age || 'N/A'}
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-muted-foreground line-clamp-1">
                                            {persona.tagline}
                                          </p>
                                          {persona.demographics.occupation && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {persona.demographics.occupation}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t">
                              <Button variant="outline" onClick={() => setShowPersonaDialog(false)}>
                                Annuleren
                              </Button>
                              <Button onClick={() => setShowPersonaDialog(false)}>
                                <Check className="h-4 w-4 mr-2" />
                                Toepassen ({selectedPersonaIds.length})
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Selected Personas Display */}
                      {selectedPersonaIds.length > 0 ? (
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <div className="flex flex-wrap gap-2">
                            {selectedPersonaIds.map(personaId => {
                              const persona = personas.find(p => p.id === personaId);
                              if (!persona) return null;
                              return (
                                <div
                                  key={personaId}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-background border rounded-md"
                                >
                                  <Users className="h-3.5 w-3.5 text-primary" />
                                  <span className="text-sm font-medium">{persona.name}</span>
                                  <button
                                    onClick={() => {
                                      setSelectedPersonaIds(prev => prev.filter(id => id !== personaId));
                                    }}
                                    className="ml-1 hover:text-destructive transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-3">
                            Geen persona's geselecteerd
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPersonaDialog(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Voeg Persona's Toe
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={handleManualSubmit}
                    disabled={isAnalyzing}
                    className="w-full"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Opslaan...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Product/Service Opslaan
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tips voor het invullen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      💡
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1">Wees specifiek</div>
                      <div className="text-sm text-muted-foreground">
                        Hoe specifieker je bent in features en voordelen, hoe beter de AI je kan helpen
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      📝
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1">Eén item per regel</div>
                      <div className="text-sm text-muted-foreground">
                        Bij features, benefits en use cases: zet elk punt op een nieuwe regel
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      ⚡
                    </div>
                    <div>
                      <div className="font-medium text-sm mb-1">Later aanpassen</div>
                      <div className="text-sm text-muted-foreground">
                        Je kunt alle informatie later nog bewerken en aanvullen
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
                <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  1
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Kies je methode</div>
                  <div className="text-sm text-muted-foreground">
                    Selecteer URL analyse, PDF upload, of handmatige invoer
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  2
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Analyseer of voer in</div>
                  <div className="text-sm text-muted-foreground">
                    De AI analyseert automatisch alle productinformatie
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  3
                </div>
                <div>
                  <div className="font-medium text-sm mb-1">Bekijk en gebruik</div>
                  <div className="text-sm text-muted-foreground">
                    Gebruik de geëxtraheerde data in je campaigns en strategies
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