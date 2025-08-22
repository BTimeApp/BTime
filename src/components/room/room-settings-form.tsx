import { Button } from "@/components/ui/button";
import { z } from "zod";
import { FieldErrors, FieldValues, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/context/socket-context";
import { useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IRoomSettings,
  MATCH_FORMAT_MAP,
  MATCH_FORMATS,
  MatchFormat,
  ROOM_EVENT_DISPLAY_NAME_MAP,
  ROOM_EVENTS,
  ROOM_FORMAT_MAP,
  ROOM_FORMATS,
  RoomEvent,
  RoomFormat,
  SET_FORMAT_MAP,
  SET_FORMATS,
  SetFormat,
} from "@/types/room";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/context/session-context";
import { toast } from "sonner";
import { SOCKET_CLIENT } from "@/types/socket_protocol";

const formSchema = z.object({
  roomName: z
    .string()
    .min(1, {
      message: "Room name cannot be empty.",
    })
    .max(100, { message: "Room name must not be over 100 characters." }),
  roomFormat: z.enum(ROOM_FORMATS),
  roomEvent: z.enum(ROOM_EVENTS),
  isPrivate: z.boolean(),
  password: z.string(),
  matchFormat: z.enum(MATCH_FORMATS),
  setFormat: z.enum(SET_FORMATS),
  nSets: z.number().int(),
  nSolves: z.number().int(),
});

type RoomSettingsFormProps = {
  roomName: string;
  roomFormat: RoomFormat;
  roomEvent: RoomEvent;
  isPrivate: boolean;
  matchFormat?: MatchFormat;
  setFormat?: SetFormat;
  nSets?: number;
  nSolves?: number;
  roomId?: string;
  createNewRoom: boolean;
  submitButtonRef?: React.RefObject<HTMLButtonElement>;
  onCreateCallback?: (roomId: string) => void;
  onUpdateCallback?: () => void;
};

/**
 * TODO: if the intent is to use this component for both settings and normal create page, need to move the roomstore hook out of this component and accept it all in props...
 */
export default function RoomSettingsForm({
  roomName,
  roomFormat,
  roomEvent,
  isPrivate,
  matchFormat,
  setFormat,
  nSets,
  nSolves,
  roomId,
  createNewRoom,
  submitButtonRef,
  onCreateCallback,
  onUpdateCallback,
}: RoomSettingsFormProps) {
  const { user, loading: userLoading } = useSession();
  const { socket, socketConnected } = useSocket();

  // form schema
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomName: roomName,
      roomFormat: roomFormat,
      roomEvent: roomEvent,
      isPrivate: isPrivate,
      password: "",
      matchFormat: matchFormat,
      setFormat: setFormat,
      nSets: nSets,
      nSolves: nSolves,
    },
  });

  // declare these state variables to conditionally render other fields
  const [isPrivateState, setIsPrivateState] = useState<boolean>(isPrivate);
  const [roomFormatState, setRoomFormatState] =
    useState<RoomFormat>(roomFormat);

  const [formError, setFormError] = useState<boolean>(false);
  const [formErrorText, setFormErrorText] = useState<string>("");

  useEffect(() => {
    if (userLoading) {
      return;
    }
    if (!user || !socket || !socketConnected) {
      setFormError(true);
      if (!user) {
        setFormErrorText("User is not logged in.");
      } else if (!socket || !socketConnected) {
        console.log(socket, socketConnected);
        setFormErrorText(
          "Websocket is not connected. Try refreshing the page."
        );
      }
    } else {
      setFormError(false);
      setFormErrorText("");
    }
  }, [user, userLoading, socket, socketConnected]);

  const onSubmit = useCallback(
    (values: z.infer<typeof formSchema>) => {
      if (!socket || !user) {
        console.log(socket, user);
        return;
      }

      //this cast should be safe
      const newRoomSettings: IRoomSettings = values as IRoomSettings;

      //send room create/update event
      if (createNewRoom) {
        socket.emit(
          SOCKET_CLIENT.CREATE_ROOM,
          { roomSettings: newRoomSettings },
          onCreateCallback
        );
      } else {
        socket.emit(
          SOCKET_CLIENT.UPDATE_ROOM,
          newRoomSettings,
          roomId,
          user.id,
          onUpdateCallback
        );
      }
    },
    [socket, user, createNewRoom, onCreateCallback, onUpdateCallback, roomId]
  );

  const onError = useCallback((errors: FieldErrors<FieldValues>) => {
    toast.error(
      "Error(s) in form: " +
        Object.values(errors).map((err) => err?.message?.toString())
    );
  }, []);

  return (
    <div className="m-1">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onError)}
          className="space-y-8"
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="space-x-5 space-y-3">
              <p className="text-xl font-bold">INFO</p>
              <FormField
                control={form.control}
                name="roomName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Name</FormLabel>
                    <FormControl>
                      <Input placeholder={roomName} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roomFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value: string) => {
                          field.onChange(value);
                          setRoomFormatState(value as RoomFormat);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={roomFormat} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROOM_FORMATS.map((val, idx) => (
                            <SelectItem key={idx} value={val}>
                              {ROOM_FORMAT_MAP.get(val)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roomEvent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Event</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={ROOM_EVENT_DISPLAY_NAME_MAP.get(
                                roomEvent
                              )}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROOM_EVENTS.map((val, idx) => (
                            <SelectItem key={idx} value={val}>
                              {ROOM_EVENT_DISPLAY_NAME_MAP.get(val)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isPrivate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Private?</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked: boolean) => {
                          field.onChange(checked);
                          setIsPrivateState(checked);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isPrivateState && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <div className="space-y-3">
              <p className="text-xl font-bold">FORMAT</p>
              {roomFormatState === "RACING" && (
                <>
                  <FormField
                    control={form.control}
                    name="matchFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Format</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={matchFormat} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MATCH_FORMATS.map((val, idx) => (
                                <SelectItem key={idx} value={val}>
                                  {MATCH_FORMAT_MAP.get(val)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nSets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel># Sets</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={nSets?.toString()}
                            type="number"
                            step="1"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                isNaN(parseInt(e.target.value))
                                  ? ""
                                  : parseInt(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="setFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Set Format</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={setFormat} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SET_FORMATS.map((val, idx) => (
                                <SelectItem key={idx} value={val}>
                                  {SET_FORMAT_MAP.get(val)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="nSolves"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel># Solves</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={nSolves?.toString()}
                            type="number"
                            step="1"
                            {...field}
                            onChange={(e) =>
                              field.onChange(
                                isNaN(parseInt(e.target.value))
                                  ? ""
                                  : parseInt(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-xl font-bold">EXTRA</p>
            </div>
          </div>
          <div className="space-y-1">
            <Button
              variant={formError ? "primary_inactive" : "primary"}
              type="submit"
              className="text-lg font-bold"
              ref={submitButtonRef}
              disabled={formError}
            >
              {createNewRoom ? "CREATE" : "UPDATE"}
            </Button>
            {formError && <div className="text-error">{formErrorText}</div>}
          </div>
        </form>
      </Form>
    </div>
  );
}
