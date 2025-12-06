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
  Access,
  IRoomSettings,
  MATCH_FORMATS,
  RaceSettings,
  ROOM_EVENTS,
  ROOM_EVENTS_INFO,
  ROOM_FORMATS,
  RoomEvent,
  RoomFormat,
  SET_FORMATS,
  TEAM_REDUCE_FUNCTIONS,
  TEAM_SCRAMBLE_FORMATS,
  TEAM_SOLVE_FORMATS,
  TeamSettings,
} from "@/types/room";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/context/session-context";
import { toast } from "sonner";
import { SOCKET_CLIENT } from "@/types/socket_protocol";
import { cn, displayText, literalKeys } from "@/lib/utils";
import { Path } from "react-hook-form";

const ROOM_TEMPLATE_INFO = {
  // TODO - figure out how to allow Select to be blank. Until then, workaround
  NONE: {},
  RELAY: {
    "teamSettings.teamsEnabled": true,
    "teamSettings.teamFormatSettings.teamSolveFormat": "ALL",
    "teamSettings.teamFormatSettings.teamReduceFunction": "SUM",
    "teamSettings.teamFormatSettings.teamScrambleFormat": "DIFFERENT",
  },
  CREW_BATTLE: {
    "teamSettings.teamsEnabled": true,
    "teamSettings.teamFormatSettings.teamSolveFormat": "ONE",
  },
  MONKEY_LEAGUE: {
    "teamSettings.teamsEnabled": true,
    "teamSettings.teamFormatSettings.teamSolveFormat": "ONE",
    "teamSettings.maxNumTeams": 2,
    "teamSettings.maxTeamCapacity": 1,
    "raceSettings.matchFormat": "BEST_OF",
    "raceSettings.nSets": 5,
    "raceSettings.setFormat": "BEST_OF",
    "raceSettings.nSolves": 5,
  },
};

const ROOM_TEMPLATES = literalKeys(ROOM_TEMPLATE_INFO);
type RoomTemplateKey = (typeof ROOM_TEMPLATES)[number];

const AccessSchema = z.discriminatedUnion("visibility", [
  z.object({
    visibility: z.literal("PRIVATE"),
    password: z.string().min(1, "Password is required"),
  }),
  z.object({
    visibility: z.literal("PUBLIC"),
  }),
]);

const RaceSettingsSchema = z.discriminatedUnion("roomFormat", [
  z.object({
    roomFormat: z.literal("CASUAL"),
  }),
  z.object({
    roomFormat: z.literal("RACING"),
    matchFormat: z.enum(MATCH_FORMATS),
    setFormat: z.enum(SET_FORMATS),
    nSets: z.number().int(),
    nSolves: z.number().int(),
  }),
]);

const TeamFormatSettingsSchema = z.discriminatedUnion("teamSolveFormat", [
  z.object({
    teamSolveFormat: z.literal("ONE"),
  }),
  z.object({
    teamSolveFormat: z.literal("ALL"),
    teamScrambleFormat: z.enum(TEAM_SCRAMBLE_FORMATS),
    teamReduceFunction: z.enum(TEAM_REDUCE_FUNCTIONS),
  }),
]);

const TeamSettingsSchema = z.discriminatedUnion("teamsEnabled", [
  z.object({ teamsEnabled: z.literal(false) }),
  z.object({
    teamsEnabled: z.literal(true),
    teamFormatSettings: TeamFormatSettingsSchema,
    maxTeamCapacity: z
      .number()
      .int()
      .min(1, "Must allow at least 1 member per team")
      .optional(),
    maxNumTeams: z
      .number()
      .int()
      .min(1, "Must allow at least 1 team")
      .optional(),
  }),
]);

const formSchema = z.object({
  roomName: z
    .string()
    .min(1, {
      message: "Room name cannot be empty.",
    })
    .max(100, { message: "Room name must not be over 100 characters." }),
  roomEvent: z.enum(ROOM_EVENTS as [RoomEvent, ...RoomEvent[]]),
  access: AccessSchema,
  raceSettings: RaceSettingsSchema,
  teamSettings: TeamSettingsSchema,
  template: z
    .enum(ROOM_TEMPLATES as [RoomTemplateKey, ...RoomTemplateKey[]])
    .optional(),
  maxUsers: z
    .number()
    .min(1, { message: "Room cannot have a maximum of fewer than 1 user." })
    .optional(),
});

type RoomSettingsFormProps = {
  roomName: string;
  roomEvent: RoomEvent;
  access: Access;
  raceSettings: RaceSettings;
  teamSettings: TeamSettings;
  roomId?: string;
  maxUsers?: number;
  createNewRoom: boolean;
  submitButtonRef?: React.RefObject<HTMLButtonElement>;
  onCreateCallback?: (roomId: string) => void;
  onUpdateCallback?: () => void;
  className?: string;
};

export default function RoomSettingsForm({
  roomName,
  roomEvent,
  access,
  raceSettings,
  teamSettings,
  roomId,
  maxUsers,
  createNewRoom,
  submitButtonRef,
  onCreateCallback,
  onUpdateCallback,
  className,
}: RoomSettingsFormProps) {
  const { user, loading: userLoading } = useSession();
  const { socket, socketConnected } = useSocket();

  // form schema
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomName: roomName,
      roomEvent: roomEvent,
      access: access,
      raceSettings: raceSettings,
      teamSettings: teamSettings,
      maxUsers: maxUsers,
    },
  });

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
        // console.log(socket, socketConnected);
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
        // console.log(socket, user);
        return;
      }

      //this cast should be safe
      const { template, ...settings } = values;
      void template;
      const roomSettings: IRoomSettings = settings as IRoomSettings;

      //send room create/update event
      if (createNewRoom) {
        socket.emit(
          SOCKET_CLIENT.CREATE_ROOM,
          { roomSettings: roomSettings },
          onCreateCallback
        );
      } else {
        socket.emit(
          SOCKET_CLIENT.UPDATE_ROOM,
          roomSettings,
          roomId,
          user.userInfo.id,
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

  const handleTemplateChange = useCallback(
    (templateKey: RoomTemplateKey) => {
      const templateInfo = ROOM_TEMPLATE_INFO[templateKey];
      if (templateInfo) {
        for (const [k, v] of Object.entries(templateInfo)) {
          console.log(k as Path<z.infer<typeof formSchema>>);
          form.setValue(k as Path<z.infer<typeof formSchema>>, v, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      }
    },
    [form] // form is a dependency since we're using setValue and trigger
  );

  const handleRoomFormatChange = useCallback(
    (roomFormat: RoomFormat) => {
      switch (roomFormat) {
        case "CASUAL":
          break;
        case "RACING":
          form.setValue("raceSettings.matchFormat", "BEST_OF");
          form.setValue("raceSettings.setFormat", "BEST_OF");
          form.setValue("raceSettings.nSets", 3);
          form.setValue("raceSettings.nSolves", 7);
          break;
        default:
          const illegalRoomFormat: never = roomFormat;
          console.warn(`Illegal Room Format encountered: ${illegalRoomFormat}`);
      }
    },
    [form]
  );

  return (
    <div className={cn("m-1 h-full max-h-full overflow-y-auto", className)}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onError)}
          className="flex flex-col gap-8 h-full"
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
                name="raceSettings.roomFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value: RoomFormat) => {
                          field.onChange(value);
                          handleRoomFormatChange(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={field.value} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROOM_FORMATS.map((val, idx) => (
                            <SelectItem key={idx} value={val}>
                              {displayText(val)}
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
                              placeholder={
                                ROOM_EVENTS_INFO[roomEvent].displayName
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROOM_EVENTS.map((val, idx) => (
                            <SelectItem key={idx} value={val}>
                              {ROOM_EVENTS_INFO[val].displayName}
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
                name="access.visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Private Room</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value === "PRIVATE"}
                        onCheckedChange={(checked: boolean) => {
                          field.onChange(checked ? "PRIVATE" : "PUBLIC");
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("access.visibility") === "PRIVATE" && (
                <FormField
                  control={form.control}
                  name="access.password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Password:"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="teamSettings.teamsEnabled"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teams Mode</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(value) => {
                          field.onChange(value);

                          if (value) {
                            form.setValue(
                              "teamSettings.teamFormatSettings.teamSolveFormat",
                              "ALL"
                            );
                            form.setValue(
                              "teamSettings.teamFormatSettings.teamScrambleFormat",
                              "SAME"
                            );
                            form.setValue(
                              "teamSettings.teamFormatSettings.teamReduceFunction",
                              "MEAN"
                            );
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Template (optional)</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value: string) => {
                          field.onChange(value);
                          handleTemplateChange(value as RoomTemplateKey);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={displayText(field.value)}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROOM_TEMPLATES.map((val, idx) => (
                            <SelectItem key={idx} value={val}>
                              {displayText(val)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-3">
              <p className="text-xl font-bold">FORMAT</p>
              {form.watch("raceSettings.roomFormat") !== "CASUAL" && (
                <>
                  <FormField
                    control={form.control}
                    name="raceSettings.matchFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Match Format</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={field.value ?? "Best of"}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MATCH_FORMATS.map((val, idx) => (
                                <SelectItem key={idx} value={val}>
                                  {displayText(val)}
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
                    name="raceSettings.nSets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel># Sets</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={field.value?.toString() ?? "3"}
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
                    name="raceSettings.setFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Set Format</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={field.value ?? "Best of"}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SET_FORMATS.map((val, idx) => (
                                <SelectItem key={idx} value={val}>
                                  {displayText(val)}
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
                    name="raceSettings.nSolves"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel># Solves</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={field.value?.toString() ?? "7"}
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
              {form.watch("teamSettings.teamsEnabled") && (
                <>
                  <FormField
                    control={form.control}
                    name="teamSettings.teamFormatSettings.teamSolveFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Solve Format</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);

                              if (value) {
                                form.setValue(
                                  "teamSettings.teamFormatSettings.teamScrambleFormat",
                                  "SAME"
                                );
                                form.setValue(
                                  "teamSettings.teamFormatSettings.teamReduceFunction",
                                  "MEAN"
                                );
                              }
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={field.value} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TEAM_SOLVE_FORMATS.map((val, idx) => (
                                <SelectItem key={idx} value={val}>
                                  {displayText(val)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch(
                    "teamSettings.teamFormatSettings.teamSolveFormat"
                  ) === "ALL" && (
                    <>
                      <FormField
                        control={form.control}
                        name="teamSettings.teamFormatSettings.teamReduceFunction"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team Solve Reduce Function</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                }}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={field.value} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TEAM_REDUCE_FUNCTIONS.map((val, idx) => (
                                    <SelectItem key={idx} value={val}>
                                      {displayText(val)}
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
                        name="teamSettings.teamFormatSettings.teamScrambleFormat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Team Scramble Format</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                }}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={field.value} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {TEAM_SCRAMBLE_FORMATS.map((val, idx) => (
                                    <SelectItem key={idx} value={val}>
                                      {displayText(val)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-xl font-bold">EXTRA</p>
              <FormField
                control={form.control}
                name="maxUsers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max # Users</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={field.value ? field.value.toString() : ""}
                        type="number"
                        step="1"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(
                            val === "" ? undefined : parseInt(val)
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("teamSettings.teamsEnabled") && (
                <>
                  <FormField
                    control={form.control}
                    name="teamSettings.maxNumTeams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max # Teams</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              field.value ? field.value.toString() : ""
                            }
                            type="number"
                            step="1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(
                                val === "" ? undefined : parseInt(val)
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="teamSettings.maxTeamCapacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Team Capacity</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={field.value?.toString() ?? ""}
                            type="number"
                            step="1"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(
                                val === "" ? undefined : parseInt(val)
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Button
              variant={formError ? "primary_inactive" : "primary"}
              type="submit"
              className="text-lg font-bold mt-auto"
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
