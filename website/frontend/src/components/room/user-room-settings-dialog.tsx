import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const { setUseInspection, setTimerType, setDrawScramble } = useRoomActions();

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
              {/* TODO - update when we implement more than GAN timer */}
              <SelectItem value="BLUETOOTH">GAN Timer</SelectItem>
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
            defaultValue={theme}
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
