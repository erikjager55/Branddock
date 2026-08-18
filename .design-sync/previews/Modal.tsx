import { Modal, Button } from 'branddock-app';

export const Standaard = () => (
  <Modal
    isOpen
    onClose={() => {}}
    title="Persona verwijderen"
    subtitle="Deze actie kan niet ongedaan worden gemaakt."
    footer={
      <div className="flex justify-end gap-2">
        <Button variant="ghost">Annuleren</Button>
        <Button variant="danger">Verwijderen</Button>
      </div>
    }
  >
    <p className="text-sm text-gray-600">
      &ldquo;Marketingmanager MKB&rdquo; wordt uit 5 campagnes losgekoppeld. De campagnes
      zelf blijven bestaan.
    </p>
  </Modal>
);

export const ZonderVoettekst = () => (
  <Modal isOpen onClose={() => {}} title="Merkcontext" size="sm">
    <p className="text-sm text-gray-600">
      Elke generatie krijgt je merk-DNA mee: positionering, merkstem, persona&apos;s en stijlregels.
    </p>
  </Modal>
);
