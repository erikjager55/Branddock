import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { ValidationMethodButton, ValidationMethodButtonCompact } from './validation/ValidationMethodButton';
import { Sparkles, Users, FlaskConical, FileText } from 'lucide-react';

/**
 * Demo page showcasing ValidationMethodButton in both default and compact variants
 * Shows all 4 states: available, running, completed, locked
 */
export function ValidationMethodDemo() {
  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">ValidationMethodButton Demo</h1>
          <p className="text-muted-foreground">
            Vergelijk de default (card) en compact (list) variants
          </p>
        </div>

        {/* Side by Side Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* DEFAULT VARIANT */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                Default Variant
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Full card layout • p-3 padding • text-sm • Shows all metadata
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* State 1: Available */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  STATE 1: AVAILABLE
                </div>
                <ValidationMethodButton
                  label="AI Exploration"
                  description="5-10 min • Quick insights"
                  icon={Sparkles}
                  status="available"
                  type="ai-exploration"
                  onPrimaryClick={() => alert('Start clicked!')}
                />
              </div>

              {/* State 2: Running */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  STATE 2: RUNNING
                </div>
                <ValidationMethodButton
                  label="Surveys"
                  description="Collecting responses..."
                  icon={FileText}
                  status="running"
                  progress={65}
                  onPrimaryClick={() => alert('View Progress clicked!')}
                />
              </div>

              {/* State 3: Completed */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  STATE 3: COMPLETED
                </div>
                <ValidationMethodButton
                  label="Interviews"
                  description="Research complete • High confidence"
                  icon={Users}
                  status="completed"
                  onPrimaryClick={() => alert('View Results clicked!')}
                />
              </div>

              {/* State 4: Locked */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  STATE 4: LOCKED
                </div>
                <ValidationMethodButton
                  label="User Testing"
                  description="Requires Premium plan"
                  icon={FlaskConical}
                  status="locked"
                  unlockTier="premium"
                  onPrimaryClick={() => alert('Unlock clicked!')}
                />
              </div>

            </CardContent>
          </Card>

          {/* COMPACT VARIANT */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </div>
                Compact Variant
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                List item layout • p-2 padding • text-xs • Hides metadata
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {/* State 1: Available */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  STATE 1: AVAILABLE
                </div>
                <ValidationMethodButtonCompact
                  label="AI Exploration"
                  description="5-10 min • Quick insights"
                  icon={Sparkles}
                  status="available"
                  type="ai-exploration"
                  onPrimaryClick={() => alert('Start clicked!')}
                />
              </div>

              {/* State 2: Running */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  STATE 2: RUNNING
                </div>
                <ValidationMethodButtonCompact
                  label="Surveys"
                  description="Collecting responses..."
                  icon={FileText}
                  status="running"
                  progress={65}
                  onPrimaryClick={() => alert('View Progress clicked!')}
                />
              </div>

              {/* State 3: Completed */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  STATE 3: COMPLETED
                </div>
                <ValidationMethodButtonCompact
                  label="Interviews"
                  description="Research complete • High confidence"
                  icon={Users}
                  status="completed"
                  onPrimaryClick={() => alert('View Results clicked!')}
                />
              </div>

              {/* State 4: Locked */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  STATE 4: LOCKED
                </div>
                <ValidationMethodButtonCompact
                  label="User Testing"
                  description="Requires Premium plan"
                  icon={FlaskConical}
                  status="locked"
                  unlockTier="premium"
                  onPrimaryClick={() => alert('Unlock clicked!')}
                />
              </div>

            </CardContent>
          </Card>

        </div>

        {/* Usage Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Example 1: Default */}
            <div>
              <div className="text-sm font-semibold mb-2">1. Default Variant (Card Layout)</div>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`<ValidationMethodButton
  label="AI Exploration"
  description="5-10 min • Quick insights"
  icon={Sparkles}
  status="available"
  type="ai-exploration"
  onPrimaryClick={() => handleStart()}
/>`}
              </pre>
            </div>

            {/* Example 2: Compact */}
            <div>
              <div className="text-sm font-semibold mb-2">2. Compact Variant (List Layout)</div>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
{`<ValidationMethodButton
  label="AI Exploration"
  icon={Sparkles}
  status="available"
  variant="compact"
  onPrimaryClick={() => handleStart()}
/>

// Or use the helper component:
<ValidationMethodButtonCompact
  label="AI Exploration"
  icon={Sparkles}
  status="available"
  onPrimaryClick={() => handleStart()}
/>`}
              </pre>
            </div>

            {/* When to use */}
            <div className="border-t pt-4">
              <div className="text-sm font-semibold mb-2">📘 When to Use Each Variant</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="font-medium text-primary">Default Variant:</div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                    <li>Main content areas</li>
                    <li>Detail pages</li>
                    <li>Dashboard cards</li>
                    <li>When space is available</li>
                    <li>When metadata is important</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="font-medium text-blue-600">Compact Variant:</div>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 text-xs">
                    <li>Sidebars</li>
                    <li>Quick lists</li>
                    <li>Inline displays</li>
                    <li>When space is limited</li>
                    <li>When only status matters</li>
                  </ul>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Visual Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Property</th>
                    <th className="text-left p-3 font-medium">Default</th>
                    <th className="text-left p-3 font-medium">Compact</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Padding</td>
                    <td className="p-3 font-mono">p-3</td>
                    <td className="p-3 font-mono">p-2</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Icon Container</td>
                    <td className="p-3 font-mono">h-8 w-8</td>
                    <td className="p-3 font-mono">h-6 w-6</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Icon Size</td>
                    <td className="p-3 font-mono">h-4 w-4</td>
                    <td className="p-3 font-mono">h-3 w-3</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Title Size</td>
                    <td className="p-3 font-mono">text-sm</td>
                    <td className="p-3 font-mono">text-xs</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Meta Size</td>
                    <td className="p-3 font-mono">text-xs</td>
                    <td className="p-3 font-mono">text-[10px]</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Gap</td>
                    <td className="p-3 font-mono">gap-3</td>
                    <td className="p-3 font-mono">gap-2</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Button Height</td>
                    <td className="p-3 font-mono">h-8 px-3</td>
                    <td className="p-3 font-mono">h-6 px-2</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 text-muted-foreground">Shows Description</td>
                    <td className="p-3">✅ Yes</td>
                    <td className="p-3">❌ No (hidden)</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-muted-foreground">Shows Metadata</td>
                    <td className="p-3">✅ Yes</td>
                    <td className="p-3">❌ No (hidden)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Visual Sizing Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Height Comparison</CardTitle>
            <p className="text-sm text-muted-foreground">
              Same styling, different density
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Stacked comparison */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Default: ~52px height
                </div>
                <ValidationMethodButton
                  label="Interviews"
                  description="30-60 min • Deep insights"
                  icon={Users}
                  status="completed"
                  onPrimaryClick={() => {}}
                />
              </div>
              
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Compact: ~36px height (~30% kleiner)
                </div>
                <ValidationMethodButtonCompact
                  label="Interviews"
                  description="30-60 min • Deep insights"
                  icon={Users}
                  status="completed"
                  onPrimaryClick={() => {}}
                />
              </div>
            </div>

            {/* List density example */}
            <div className="border-t pt-6">
              <div className="text-sm font-semibold mb-4">List Density Example</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Default: 4 items = ~240px
                  </div>
                  <div className="space-y-2">
                    <ValidationMethodButton label="Method 1" icon={Sparkles} status="completed" onPrimaryClick={() => {}} />
                    <ValidationMethodButton label="Method 2" icon={Users} status="running" progress={45} onPrimaryClick={() => {}} />
                    <ValidationMethodButton label="Method 3" icon={FileText} status="available" onPrimaryClick={() => {}} />
                    <ValidationMethodButton label="Method 4" icon={FlaskConical} status="locked" unlockTier="premium" onPrimaryClick={() => {}} />
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Compact: 4 items = ~168px (~30% minder ruimte)
                  </div>
                  <div className="space-y-2">
                    <ValidationMethodButtonCompact label="Method 1" icon={Sparkles} status="completed" onPrimaryClick={() => {}} />
                    <ValidationMethodButtonCompact label="Method 2" icon={Users} status="running" progress={45} onPrimaryClick={() => {}} />
                    <ValidationMethodButtonCompact label="Method 3" icon={FileText} status="available" onPrimaryClick={() => {}} />
                    <ValidationMethodButtonCompact label="Method 4" icon={FlaskConical} status="locked" unlockTier="premium" onPrimaryClick={() => {}} />
                  </div>
                </div>

              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}
