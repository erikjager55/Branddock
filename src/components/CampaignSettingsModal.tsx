import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Trash2 } from 'lucide-react';

interface CampaignSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    name: string;
    notes?: string;
    assignee?: string;
  };
  onSave: (data: { name: string; notes: string; assignee: string }) => void;
  onDelete: (id: string) => void;
}

const teamMembers = [
  {
    id: '1',
    name: 'Mark Johnson',
    email: 'mark@company.com',
    avatar: '',
    initials: 'MJ'
  },
  {
    id: '2',
    name: 'Sarah Chen',
    email: 'sarah@company.com',
    avatar: '',
    initials: 'SC'
  },
  {
    id: '3',
    name: 'Alex Rivera',
    email: 'alex@company.com',
    avatar: '',
    initials: 'AR'
  },
  {
    id: '4',
    name: 'Emma Davis',
    email: 'emma@company.com',
    avatar: '',
    initials: 'ED'
  }
];

export function CampaignSettingsModal({
  isOpen,
  onClose,
  campaign,
  onSave,
  onDelete
}: CampaignSettingsModalProps) {
  const [name, setName] = useState(campaign.name);
  const [notes, setNotes] = useState(campaign.notes || '');
  const [assignee, setAssignee] = useState(campaign.assignee || '1');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    onSave({ name, notes, assignee });
    onClose();
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(campaign.id);
      onClose();
    } else {
      setShowDeleteConfirm(true);
      // Reset after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const selectedMember = teamMembers.find(m => m.id === assignee);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Edit Campaign Details
          </DialogTitle>
          <DialogDescription className="sr-only">
            Update campaign name, internal notes, and assignee
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign-name" className="text-sm font-medium">
              Campaign Name
            </Label>
            <Input
              id="campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter campaign name"
              className="w-full"
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label htmlFor="internal-notes" className="text-sm font-medium">
              Internal Notes
            </Label>
            <Textarea
              id="internal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context for the team..."
              rows={4}
              className="w-full resize-none"
            />
            <p className="text-xs text-muted-foreground">
              These notes are only visible to your team
            </p>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label htmlFor="assignee" className="text-sm font-medium">
              Assignee
            </Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="assignee" className="w-full">
                <SelectValue>
                  {selectedMember && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedMember.avatar} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {selectedMember.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedMember.name}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{member.name}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between sm:justify-between">
          {/* Left - Delete */}
          <Button
            type="button"
            variant="ghost"
            className={`text-destructive hover:text-destructive hover:bg-destructive/10 ${
              showDeleteConfirm ? 'bg-destructive/10' : ''
            }`}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {showDeleteConfirm ? 'Click again to confirm' : 'Delete Campaign'}
          </Button>

          {/* Right - Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-foreground text-background hover:bg-foreground/90"
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}