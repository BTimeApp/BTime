export default function RoomHeaderContent({isStarted}: {isStarted?: boolean}) {

    const exampleScramble = "Scramble Placeholder";
    return (
        <>
            <h2 className="grow font-bold text-center text-2xl">{isStarted ? exampleScramble : "Scramble will display after starting"}</h2>
        </>
    );
}