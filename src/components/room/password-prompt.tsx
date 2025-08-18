import { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { useCallback } from "react";
import { IRoom } from "@/types/room";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  password: z.string(),
});

type PasswordPromptProps = {
  socket: Socket;
  roomId: string;
  userId: string; //require authenticated user
  passwordValidationCallback: (
    roomValid: boolean,
    room?: IRoom,
    extraData?: Record<string, string>
  ) => void;
};

function PasswordPrompt({
  socket,
  roomId,
  userId,
  passwordValidationCallback,
}: PasswordPromptProps) {
  // form schema
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
    },
  });

  // const [password, setPassword] = useState(""); //local state tracked in input

  const onSubmit = useCallback(
    (values: z.infer<typeof formSchema>) => {
      if (!socket) return;
      //emit a socket event with roomId, userId, password, and onPasswordValid callback.
      socket.emit(
        "join_room",
        { roomId: roomId, userId: userId, password: values.password },
        passwordValidationCallback
      );
    },
    [socket, roomId, userId, passwordValidationCallback]
  );

  if (!socket.connected) {
    return <div>Socket not connected yet.</div>;
  }

  return (
    <Dialog open={true}>
      <DialogContent
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogTitle>Enter Password</DialogTitle>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

            <div className="flex flex-row">
              <Button variant="primary" type="submit" className="font-bold">
                Submit
              </Button>

              <Button variant="primary" className="font-bold ml-auto" onClick={() => {window.location.href="/"}}>
                Back to Home
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default PasswordPrompt;
