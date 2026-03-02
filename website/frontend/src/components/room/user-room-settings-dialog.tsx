import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectItem,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useRoomActions, useRoomStore } from "@/context/room-context";
import { useTheme } from "@/context/theme-context";
import { TIMER_TYPES_INFO } from "@btime/types";
import { Moon, Sun } from "lucide-react";

type UserRoomSettingsDialogProps = {
  children: React.ReactNode;
};

export default function UserRoomSettingsDialog({
  children,
}: UserRoomSettingsDialogProps) {
  const { theme, setTheme } = useTheme();
  const useInspection = useRoomStore((s) => s.useInspection);
  const timerType = useRoomStore((s) => s.timerType);
  const drawScramble = useRoomStore((s) => s.drawScramble);
  const useSessionStats = useRoomStore((s) => s.useSessionStats);
  const roomEvent = useRoomStore((s) => s.roomEvent);
  const {
    setUseInspection,
    setTimerType,
    setDrawScramble,
    setUseSessionStats,
  } = useRoomActions();

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogTitle>User Room Settings</DialogTitle>
        <ScrollArea className="max-h-[60vh]">
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
                  placeholder={
                    timerType.at(0) + timerType.slice(1).toLowerCase()
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TYPING">Typing</SelectItem>
                <SelectItem value="KEYBOARD">Keyboard</SelectItem>
                {/* TODO - update when we implement more than GAN timer */}
                <SelectItem value="BLUETOOTHTIMER">GAN Timer</SelectItem>
                {TIMER_TYPES_INFO["VIRTUAL"].allowsEvent(roomEvent) && (
                  <SelectItem value="VIRTUAL">Virtual</SelectItem>
                )}
                {TIMER_TYPES_INFO["BLUETOOTHCUBE"].allowsEvent(roomEvent) && (
                  <SelectItem value="BLUETOOTHCUBE">Bluetooth Cube</SelectItem>
                )}
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
            <p>Session Stats Enabled</p>
            <Switch
              defaultChecked={useSessionStats}
              checked={useSessionStats}
              onCheckedChange={setUseSessionStats}
            />
          </div>
          <div>
            <p>Toggle Theme</p>
            <ToggleGroup
              onValueChange={setTheme}
              type="single"
              defaultValue={theme}
              className="justify-start"
            >
              <ToggleGroupItem value="light">
                <Sun />
              </ToggleGroupItem>
              <ToggleGroupItem value="dark">
                <Moon />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
