
"use client";

import { useState } from "react";
import { Youtube, Check, ArrowRight, Save, ListMusic, ChevronRight } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { useVibeFeedback } from "@/hooks/use-vibe-feedback";
import { cn } from "@/lib/utils";

interface ExportGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (hideAgain: boolean) => void;
  isLoading?: boolean;
}

export const ExportGuideDialog = ({ open, onOpenChange, onConfirm, isLoading }: ExportGuideDialogProps) => {
  const [hideAgain, setHideAgain] = useState(false);
  const { feedback } = useVibeFeedback();

  const handleConfirm = () => {
    feedback('success');
    onConfirm(hideAgain);
  };

  const steps = [
    {
      icon: <ListMusic className="w-4 h-4 text-primary" />,
      title: "Tap 'Up Next'",
      description: "In the YouTube Music player, tap the 'Up Next' button at the bottom left."
    },
    {
      icon: <Save className="w-4 h-4 text-primary" />,
      title: "Tap 'Save'",
      description: "Tap the '+ Save' button in the playlist management section."
    },
    {
      icon: <Check className="w-4 h-4 text-primary" />,
      title: "Name & Save",
      description: "Give your PulsyVibe curation a name and save it to your library."
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-bento border-white/10 w-[min(94vw,440px)] p-0 rounded-[40px] overflow-hidden">
        <div className="bg-primary/5 p-8 border-b border-white/5 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
            <Youtube className="text-primary w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight text-white uppercase">Sync to Library</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium text-xs mt-2">
            Follow these quick steps in the YouTube Music app to keep this curation forever.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-4">
          {steps.map((step, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-4 p-4 rounded-3xl bg-white/[0.03] border border-white/5"
            >
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <span className="text-[10px] font-black text-primary">{idx + 1}</span>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">{step.title}</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <DialogFooter className="p-6 flex-col sm:flex-col gap-6">
          <div 
            className="flex items-center gap-3 self-center cursor-pointer group"
            onClick={() => {
              setHideAgain(!hideAgain);
              feedback('tick');
            }}
          >
            <Checkbox 
              id="hide-guide" 
              checked={hideAgain}
              onCheckedChange={(val) => setHideAgain(!!val)}
              className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label htmlFor="hide-guide" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest cursor-pointer group-hover:text-white transition-colors">
              Don&apos;t show this again
            </label>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 flex items-center justify-center gap-3 transition-all"
          >
            {isLoading ? "Preparing Sync..." : "Proceed to YouTube Music"}
            {!isLoading && <ChevronRight className="w-4 h-4" />}
          </motion.button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
