import {
  useForm,
  useFieldArray,
  FieldErrors,
  FieldValues,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useSocket } from "@/context/socket-context";
import { SOCKET_CLIENT, SocketResponse } from "@/types/socket_protocol";
import { Button } from "@/components/ui/button";
import { useRoomStore } from "@/context/room-context";

type CreateTeamFormProps = {
  onSubmit: () => void;
};
export function CreateTeamForm({ onSubmit }: CreateTeamFormProps) {
  const socket = useSocket();
  const teams = useRoomStore((s) => s.teams);
  const teamSettings = useRoomStore((s) => s.teamSettings);

  const currTeamsLength = useMemo(() => {
    return Object.values(teams).length;
  }, [teams]);

  // redefine schema within form b/c we need to access s.maxNumTeams potentially
  const createTeamFormSchema = z.object({
    teamNames: z
      .array(
        //https://www.reddit.com/r/typescript/comments/1cw0nvw/reacthookforms_usefieldarray_type_string_is_not/
        z.object({
          teamName: z
            .string()
            .min(1, "Team Name cannot be empty")
            .max(50, "Team name cannot be more than 50 characters"),
        })
      )
      .refine(
        (arr) =>
          !teamSettings.teamsEnabled ||
          !teamSettings.maxNumTeams ||
          arr.length <= teamSettings.maxNumTeams - currTeamsLength,
        {
          message: teamSettings.teamsEnabled
            ? `Maximum ${teamSettings.maxNumTeams} teams allowed`
            : `Cannot create teams when teams disabled`,
        }
      ),
  });

  type CreateTeamFormValues = z.infer<typeof createTeamFormSchema>;

  const form = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamFormSchema),
    defaultValues: {
      teamNames: [{ teamName: "" }], // Start with one empty input
    },
  });

  const { fields, append, remove } = useFieldArray<
    CreateTeamFormValues,
    "teamNames"
  >({
    control: form.control,
    name: "teamNames",
  });

  const socketCallback = useCallback((response: SocketResponse<undefined>) => {
    if (!response.success) {
      toast.error(response.reason);
    }
  }, []);

  const handleSubmit = (data: CreateTeamFormValues) => {
    const teamNames = data.teamNames.map((t) => t.teamName);
    socket.emit(SOCKET_CLIENT.CREATE_TEAMS, teamNames, socketCallback);
    onSubmit();
  };

  //TODO - fix. nested nature is messing with error processing
  const onError = useCallback((errors: FieldErrors<FieldValues>) => {
    toast.error(
      "Error(s) in form: " +
        Object.values(errors).map((err) => err?.message?.toString())
    );
  }, []);

  if (!teamSettings.teamsEnabled) {
    return <></>;
  }

  return (
    <div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit, onError)}
          className="px-3"
        >
          <div className="overflow-y-auto max-h-[50vh] py-3 space-y-1">
            {fields.map((field, index) => (
              <div key={field.id}>
                <FormField
                  control={form.control}
                  name={`teamNames.${index}.teamName`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-row gap-2">
                        <FormLabel>Team Name {index + 1}</FormLabel>
                        <Button
                          size="sm"
                          className="h-4"
                          type="button"
                          variant="destructive"
                          onClick={() => remove(index)}
                        >
                          -
                        </Button>
                      </div>
                      <FormControl>
                        <Input placeholder={""} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.formState.errors.teamNames?.[index] && (
                  <span>{form.formState.errors.teamNames[index]?.message}</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-row justify-between gap-2">
            {!teamSettings.maxNumTeams ||
            form.watch("teamNames").length + currTeamsLength <
              teamSettings.maxNumTeams ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => append({ teamName: "" })}
              >
                Add Another Team
              </Button>
            ) : (
              <></>
            )}

            <Button type="submit" className="ml-auto" variant="primary">
              Create Team(s)
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
