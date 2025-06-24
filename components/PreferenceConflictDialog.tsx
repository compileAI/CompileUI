'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PreferenceConflict, ConflictResolution } from '@/types/preferences';

interface PreferenceConflictDialogProps {
  open: boolean;
  conflict: PreferenceConflict;
  onResolve: (resolution: ConflictResolution) => void;
}

export default function PreferenceConflictDialog({
  open,
  conflict,
  onResolve
}: PreferenceConflictDialogProps) {
  const [contentChoice, setContentChoice] = useState<'local' | 'database'>('database');
  const [styleChoice, setStyleChoice] = useState<'local' | 'database'>('database');

  const handleApply = () => {
    onResolve({
      contentChoice: conflict.hasContentConflict ? contentChoice : 'database',
      styleChoice: conflict.hasStyleConflict ? styleChoice : 'database'
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Preference Conflict Detected
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            You have different preferences saved locally and in your account. 
            Please choose which version to keep for each setting.
          </p>
        </DialogHeader>

        <div className="space-y-8">
          {/* Content Interests Conflict */}
          {conflict.hasContentConflict && (
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Content Interests Preferences
              </Label>
              
              <RadioGroup 
                value={contentChoice} 
                onValueChange={(value: 'local' | 'database') => setContentChoice(value)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  {/* Local Version */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="local" id="content-local" />
                      <Label htmlFor="content-local" className="font-medium">
                        Keep Local Version
                      </Label>
                    </div>
                    <div className="p-3 border rounded-lg bg-muted/50">
                      <p className="text-sm">{conflict.local.contentInterests}</p>
                    </div>
                  </div>

                  {/* Database Version */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="database" id="content-database" />
                      <Label htmlFor="content-database" className="font-medium">
                        Use Account Version
                      </Label>
                    </div>
                    <div className="p-3 border rounded-lg bg-primary/5 border-primary/20">
                      <p className="text-sm">{conflict.database.contentInterests}</p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Presentation Style Conflict */}
          {conflict.hasStyleConflict && (
            <div className="space-y-4">
              <Label className="text-base font-medium">
                Presentation Style Preferences
              </Label>
              
              <RadioGroup 
                value={styleChoice} 
                onValueChange={(value: 'local' | 'database') => setStyleChoice(value)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  {/* Local Version */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="local" id="style-local" />
                      <Label htmlFor="style-local" className="font-medium">
                        Keep Local Version
                      </Label>
                    </div>
                    <div className="p-3 border rounded-lg bg-muted/50">
                      <p className="text-sm">{conflict.local.presentationStyle}</p>
                    </div>
                  </div>

                  {/* Database Version */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="database" id="style-database" />
                      <Label htmlFor="style-database" className="font-medium">
                        Use Account Version
                      </Label>
                    </div>
                    <div className="p-3 border rounded-lg bg-primary/5 border-primary/20">
                      <p className="text-sm">{conflict.database.presentationStyle}</p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}



          {/* Action Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleApply} className="px-8">
              Apply Preferences
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 