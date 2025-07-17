"use client";
import { useSession } from "@/context/sessionContext";

/** 
 * This component serves as a card-like summary of a user profile. 
 */
export default function ProfileView() {
    const { user, loading, refresh } = useSession();

    return (
        <div className="rounded-lg shadow-lg p-2 bg-container-1">
            <h2 className="font-bold text-center text-xl">Profile</h2>
            <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut sollicitudin dolor id orci vehicula fermentum. <br /><br />

                Aenean tempus, quam sit amet consectetur interdum, neque eros tincidunt urna, in porta metus libero tempus ligula. <br /><br />

                Aliquam erat volutpat. Duis cursus elementum convallis. Nunc accumsan est turpis, ut facilisis lacus consectetur sed.
            </p>
        </div>
    )
}