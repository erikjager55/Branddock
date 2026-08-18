import { Popover, PopoverTrigger, PopoverContent, Button } from 'branddock-app';
import { Info } from 'lucide-react';

export const Open = () => (
  <Popover open>
    <PopoverTrigger asChild>
      <Button variant="secondary" icon={Info}>
        Wat is F-VAL?
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-80">
      <p className="text-sm font-medium text-gray-900">Fidelity Validation</p>
      <p className="mt-1 text-sm text-gray-600">
        Drie pijlers: stijl (35%), oordeel van een AI-jury (45%) en je eigen merkregels (20%).
        Onder de 70 blokkeert de publicatiepoort.
      </p>
    </PopoverContent>
  </Popover>
);

export const Gesloten = () => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" icon={Info}>
        Uitleg (klik om te openen)
      </Button>
    </PopoverTrigger>
    <PopoverContent>
      <p className="text-sm text-gray-600">Inhoud verschijnt bij openen.</p>
    </PopoverContent>
  </Popover>
);
