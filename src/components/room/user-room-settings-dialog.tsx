import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Moon, Sun } from "lucide-react";
import { useRoomStore } from "@/context/room-context";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type UserRoomSettingsDialogProps = {
  children: React.ReactNode;
};

export default function UserRoomSettingsDialog({
  children,
}: UserRoomSettingsDialogProps) {
  // const [] = useRoomStore((s) => []);
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [
    useInspection,
    timerType,
    drawScramble,
    setUseInspection,
    setTimerType,
    setDrawScramble,
  ] = useRoomStore((s) => [
    s.useInspection,
    s.timerType,
    s.drawScramble,
    s.setUseInspection,
    s.setTimerType,
    s.setDrawScramble,
  ]);

  // Prevent mismatch between server and client
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>User Room Settings</DialogTitle>

        <div>
          <p>Inspection</p>
          <Switch
            defaultChecked={useInspection}
            checked={useInspection}
            onCheckedChange={setUseInspection}
          />
        </div>
        <div>
          <p>Timer Type</p>
          <Select onValueChange={setTimerType}>
            <SelectTrigger>
              <SelectValue
                placeholder={timerType.at(0) + timerType.slice(1).toLowerCase()}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TYPING">Typing</SelectItem>
              <SelectItem value="KEYBOARD">Keyboard</SelectItem>
              <SelectItem value="GANTIMER">GAN Timer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <p>Draw Scramble</p>
          <Switch
            defaultChecked={drawScramble}
            checked={drawScramble}
            onCheckedChange={setDrawScramble}
          />
        </div>
        <div>
          <p>Toggle Theme</p>
          <ToggleGroup
            onValueChange={setTheme}
            type="single"
            defaultValue={resolvedTheme}
          >
            <ToggleGroupItem value="light">
              <Sun />
            </ToggleGroupItem>
            <ToggleGroupItem value="dark">
              <Moon />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
}
